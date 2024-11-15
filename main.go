package main

import (
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"github.com/gorilla/mux"
	"github.com/rs/cors"
	"github.com/samber/do"
	"github.com/samber/lo"
	"github.com/tidwall/buntdb"
	"github.com/unrolled/render"
	"io/fs"
	"log"
	"mockman/api"
	"mockman/server"
	"net/http"
	"os"
	"path"
	"path/filepath"
)

// args
var host = flag.String("host", ":18080", "http api server listener")
var fileset = flag.String("fileset", "", "test file directory")
var dataset = flag.String("dataset", "./", "workspaces database file directory")
var workspace = flag.String("workspace", "", "workspaces access endpoints")

var serverRouter = mux.NewRouter()
var serverRender = render.New()
var inject = do.New()
var cs = cors.AllowAll()

//go:embed web/dist/*
var web embed.FS

func init() {
	//workspaces
	var enableWorkspaces []*api.Workspace
	if *workspace == "" {
		//default
		enableWorkspaces = append(enableWorkspaces, &api.Workspace{
			Id:       "default",
			Name:     "Default Workspace",
			Host:     ":17070",
			Endpoint: "http://127.0.0.1:17070",
		})
	} else {

		//configuration
		if _, err := os.Stat(*workspace); os.IsNotExist(err) {
			log.Panicf("workspace file IsNotExist")
		}

		fileData, _ := os.ReadFile(*workspace)
		err := json.Unmarshal(fileData, &enableWorkspaces)
		if err != nil {
			log.Panicf("workspace file invalid:%s", err)
		}
	}

	do.ProvideValue(inject, enableWorkspaces)

	//init db connection
	repos := make(server.ApiRepos)
	for _, w := range enableWorkspaces {
		//conn
		collectionConn, err := buntdb.Open(lo.Ternary(*dataset == "", ":memory:", path.Join(*dataset, fmt.Sprintf("%s.c.db", w.Id))))
		if err != nil {
			log.Panicln(err)
		}
		pathConn, err := buntdb.Open(lo.Ternary(*dataset == "", ":memory:", path.Join(*dataset, fmt.Sprintf("%s.p.db", w.Id))))
		if err != nil {
			log.Panicln(err)
		}
		repos[w.Id] = server.NewApiRepo(collectionConn, pathConn)
	}
	do.ProvideValue(inject, repos)

	// new routers
	dispatch := make(server.MultipleProxy)
	for _, w := range enableWorkspaces {
		dispatch[w.Id] = server.NewProxy(w, inject)
	}
	do.ProvideValue(inject, dispatch)

	//curd
	do.Provide(inject, server.NewCtrl)
}

func main() {
	flag.Parse()

	//WEB
	webFs, err := fs.Sub(web, "web/dist")
	if err != nil {
		log.Panicln(err)
	}

	//STATIC
	serverRouter.PathPrefix("/static").Handler(http.StripPrefix("/static", http.FileServer(http.Dir(*fileset))))

	apiRoute := serverRouter.PathPrefix("/api").Subrouter()
	//API
	ctrl := do.MustInvoke[*server.ApiCtrl](inject)
	//export workspaces endpoints
	enableWorkspaces := do.MustInvoke[[]*api.Workspace](inject)
	apiRoute.Methods("GET").Path("/workspaces").HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		_ = serverRender.JSON(writer, http.StatusOK, enableWorkspaces)
	})

	//collection
	apiRoute.Methods("GET").Path("/collections").HandlerFunc(ctrl.Collections)
	apiRoute.Methods("POST", "PUT").Path("/collection").HandlerFunc(ctrl.InsertUpdateCollection)
	apiRoute.Methods("DELETE").Path("/collection/{id}").HandlerFunc(ctrl.DeleteCollection)

	//path
	apiRoute.Methods("POST", "PUT").Path("/define").HandlerFunc(ctrl.InsertUpdate)
	apiRoute.Methods("GET").Path("/define/{id}").HandlerFunc(ctrl.Get)
	apiRoute.Methods("DELETE").Path("/define/{id}").HandlerFunc(ctrl.Delete)

	//file
	apiRoute.Methods("GET").Path("/fileset").HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {

		arr := make([]*api.File, 0)
		if *fileset != "" {
			err := filepath.Walk(*fileset, func(path string, info fs.FileInfo, err error) error {
				if info == nil || info.IsDir() {
					return nil
				}
				arr = append(arr, &api.File{
					Path:   path,
					Name:   info.Name(),
					Format: filepath.Ext(info.Name()),
				})
				return nil
			})

			if err != nil {
				http.Error(writer, err.Error(), http.StatusInternalServerError)
				return
			}
		}
		_ = serverRender.JSON(writer, http.StatusOK, arr)
	})

	serverRouter.PathPrefix("/").Handler(http.StripPrefix("/", http.FileServer(http.FS(webFs))))

	// start api server
	go func() {
		log.Printf("http server is running ：%s", *host)
		err = http.ListenAndServe(*host, cs.Handler(serverRouter))
		if err != nil {
			log.Panicln(err)
		}
	}()

	// start proxy servers
	servers := do.MustInvoke[server.MultipleProxy](inject)
	for _, mock := range servers {
		mock.Load()
		go func(workspace *api.Workspace, handler http.Handler) {

			log.Printf("%s mock server is running ：%s", workspace.Id, workspace.Host)
			err := http.ListenAndServe(workspace.Host, cs.Handler(handler))
			if err != nil {
				log.Panicln(err)
			}

		}(mock.Workspace(), mock)
	}
	select {}
}
