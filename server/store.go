package server

import (
	"encoding/json"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/samber/do"
	"github.com/samber/lo"
	"github.com/tidwall/buntdb"
	"github.com/unrolled/render"
	"io"
	"mockman/api"
	"net/http"
)

var stdRender = render.New()

type ApiCtrl struct {
	repos    ApiRepos
	dispatch MultipleProxy
}

func NewCtrl(injector *do.Injector) (*ApiCtrl, error) {
	return &ApiCtrl{
		repos:    do.MustInvoke[ApiRepos](injector),
		dispatch: do.MustInvoke[MultipleProxy](injector),
	}, nil
}

func (c *ApiCtrl) workspaceId(request *http.Request) string {
	return request.URL.Query().Get("workspaceId")
}

func (c *ApiCtrl) InsertUpdate(writer http.ResponseWriter, request *http.Request) {
	wid := c.workspaceId(request)

	// read body
	body, _ := io.ReadAll(request.Body)
	var define = &api.Define{}
	_ = json.Unmarshal(body, define)

	id := lo.TernaryF(define.Id == "", func() string {
		return uuid.New().String()
	}, func() string {
		return define.Id
	})
	define.Id = id

	//save and rebuild route
	err := c.repos[wid].save(define)
	if err != nil {
		http.Error(writer, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	_ = c.dispatch[wid].rebuild(define)
	_ = stdRender.JSON(writer, http.StatusOK, map[string]string{"id": id})
}

func (c *ApiCtrl) Delete(writer http.ResponseWriter, request *http.Request) {
	wid := c.workspaceId(request)

	id := mux.Vars(request)["id"]
	err := c.repos[wid].remove(id)
	if err != nil {
		http.Error(writer, "not found", http.StatusNotFound)
		return
	}
	_ = stdRender.JSON(writer, http.StatusOK, map[string]string{"id": id})
}

func (c *ApiCtrl) Get(writer http.ResponseWriter, request *http.Request) {
	wid := c.workspaceId(request)

	data, err := c.repos[wid].info(mux.Vars(request)["id"])
	if err != nil {
		http.Error(writer, "not found", http.StatusNotFound)
		return
	}
	_ = stdRender.JSON(writer, http.StatusOK, data)
}

func (c *ApiCtrl) Collections(writer http.ResponseWriter, request *http.Request) {
	wid := c.workspaceId(request)

	//dbQuery
	var collections = make([]*api.Collection, 0)
	err := c.repos[wid].collectionConn.View(func(tx *buntdb.Tx) error {
		return tx.Ascend("", func(key, value string) bool {
			item := &api.Collection{}
			_ = json.Unmarshal([]byte(value), item)
			collections = append(collections, item)
			return true
		})
	})

	apis, _ := c.repos[wid].list()
	group := lo.GroupBy(apis, func(item *api.Define) string {
		return item.CollectId
	})

	lo.ForEach(collections, func(item *api.Collection, index int) {
		paths, ok := group[item.Id]
		item.Paths = lo.Ternary(ok, paths, []*api.Define{})
	})

	if err != nil {
		return
	}
	_ = stdRender.JSON(writer, http.StatusOK, collections)
}

func (c *ApiCtrl) InsertUpdateCollection(writer http.ResponseWriter, request *http.Request) {

	wid := c.workspaceId(request)

	bodyBytes, _ := io.ReadAll(request.Body)
	defer request.Body.Close()

	var record = &api.Collection{}
	_ = json.Unmarshal(bodyBytes, record)

	//insert or update
	record.Id = lo.Ternary(request.Method == "POST", uuid.New().String(), record.Id)
	err := c.repos[wid].collectionConn.Update(func(tx *buntdb.Tx) error {
		saveBytes, _ := json.Marshal(record)
		_, _, err := tx.Set(record.Id, string(saveBytes), nil)
		return err
	})

	if err != nil {
		return
	}
	_ = stdRender.JSON(writer, http.StatusOK, record)
}

func (c *ApiCtrl) DeleteCollection(writer http.ResponseWriter, request *http.Request) {
	bodyBytes, _ := io.ReadAll(request.Body)
	defer request.Body.Close()

	var record = &api.Collection{}
	_ = json.Unmarshal(bodyBytes, record)

	err := c.repos[""].collectionConn.Update(func(tx *buntdb.Tx) error {
		_, err := tx.Delete(record.Id)
		return err
	})
	if err != nil {
		return
	}
	_ = stdRender.Text(writer, http.StatusOK, "OK")
}
