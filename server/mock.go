package server

import (
	"github.com/gorilla/mux"
	"github.com/samber/do"
	"log"
	"mockman/api"
	"mockman/handle"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"text/template"
)

type MultipleProxy map[string]*MockProxy

type MockProxy struct {
	workspace *api.Workspace
	subs      map[string]struct {
		define *api.Define
		route  *mux.Router
	}
	lock  *sync.Mutex
	repos ApiRepos
}

func NewProxy(workspace *api.Workspace, injector *do.Injector) *MockProxy {
	return &MockProxy{
		workspace: workspace,
		subs: make(map[string]struct {
			define *api.Define
			route  *mux.Router
		}),
		lock:  &sync.Mutex{},
		repos: do.MustInvoke[ApiRepos](injector),
	}
}

func (m *MockProxy) ServeHTTP(writer http.ResponseWriter, request *http.Request) {

	var matchDefine *api.Define
	for _, bind := range m.subs {
		if bind.route.Match(request, &mux.RouteMatch{}) {
			matchDefine = bind.define
			break
		}
	}

	if matchDefine == nil {
		http.Error(writer, "api was removed", http.StatusNotFound)
		return
	}
	m.execute(matchDefine, writer, request)
}

func (m *MockProxy) Workspace() *api.Workspace {
	return m.workspace
}

func (m *MockProxy) Load() {
	all, err := m.repos[m.workspace.Id].list()
	if err != nil {
		return
	}
	for _, define := range all {
		log.Printf("load route %s %s：%s %s", define.Id, define.Name, define.Method, define.Path)
		_ = m.rebuild(define)
	}
}

func (m *MockProxy) rebuild(define *api.Define) error {
	m.lock.Lock()
	defer m.lock.Unlock()

	//path
	rp, err := url.Parse(define.Path)
	if err != nil {
		return err
	}
	var pairs = make([]string, 0)
	for k, v := range rp.Query() {
		pairs = append(pairs, k, v[0])
	}
	pairs = append(pairs, define.RouteParams.Paris()...)

	//路由配置
	subRoute := mux.NewRouter()
	err = subRoute.
		Name(define.Id).
		Methods(define.Method).
		Path(rp.Path).
		Headers(define.RouteHeaders.Paris()...).
		Queries(pairs...).
		GetError()

	if err != nil {
		return err
	}

	m.subs[define.Id] = struct {
		define *api.Define
		route  *mux.Router
	}{define: define, route: subRoute}

	return nil
}

func (m *MockProxy) execute(define *api.Define, writer http.ResponseWriter, request *http.Request) {

	var reqContext = map[string]any{}
	defineBody := define.MockBody

	//extend functions
	encode := &handle.EncodeEvaluator{}
	req := &handle.RequestEvaluator{
		Request: request,
		Define:  define,
	}
	util := &handle.UtilEvaluator{}

	var funcMap = map[string]any{
		"header": req.Header,
		"param":  req.Param,
		"path":   req.Path,
		"form":   req.Form,
		"json":   req.GJson,
		"rand":   util.Rand,
		"uuid":   util.Uuid,
		"encode": encode.Encoded,
	}

	//rewrite header
	for _, field := range define.MockHeaders {
		if field.Key == "" || field.Value == "" {
			continue
		}
		expression := TextExpression(field.Value)
		writer.Header().Set(field.Key, expression.Eval(reqContext, funcMap))
	}

	//兼容自定义响应头
	writer.Header().Set("Access-Control-Expose-Headers", "*")

	statusField, ok := define.MockStatus.Get("statusCode")
	if !ok {
		statusField.Value = "200"
	}
	statusCode, _ := strconv.Atoi(statusField.Value)

	//rewrite response body
	//raw or bytes
	var respBytes []byte
	var respContentType string

	switch defineBody.DataType {
	case "raw":
		//text
		expr := TextExpression(defineBody.RawValue)
		result := expr.Eval(reqContext, funcMap)
		respBytes = []byte(result)

		switch defineBody.RawType {
		case "json":
			respContentType = "application/json"
			break
		case "xml":
			respContentType = "application/xml"
			break
		case "html":
			respContentType = "text/html"
			break
		default:
			respContentType = "text/plain"
		}
		break
	case "file":
		//bytes
		fileBytes, err := os.ReadFile(defineBody.FileValue.Path)
		if err != nil {
			_ = stdRender.Text(writer, http.StatusInternalServerError, err.Error())
			return
		}
		respBytes = fileBytes
		respContentType = "application/octet-stream"
		break
	default:
		//none

		//rewrite response status code
		respBytes = []byte{}
		respContentType = "text/plain"
	}

	//设置响应格式
	ct, ok := define.MockHeaders.Get("content-Type")
	if ok {
		respContentType = ct.Value
	}
	writer.Header().Set(ct.Key, respContentType)

	if statusCode != http.StatusOK {
		statusTextField, _ := define.MockStatus.Get("statusText")
		respBytes = []byte(statusTextField.Value)
	}

	//output
	writer.WriteHeader(statusCode)
	_, _ = writer.Write(respBytes)
}

type TextExpression string

func (e TextExpression) Eval(reqContext map[string]any, funcMap map[string]any) string {

	org := string(e)
	parse, err := template.New("default").Funcs(funcMap).Parse(org)
	if err != nil {
		return org
	}
	sb := &strings.Builder{}
	err = parse.ExecuteTemplate(sb, "default", reqContext)
	if err != nil {
		return org
	}
	return sb.String()
}
