package handle

import (
	"github.com/gorilla/mux"
	"github.com/tidwall/gjson"
	"io"
	"mockman/api"
	"net/http"
)

type RequestEvaluator struct {
	Define     *api.Define
	Request    *http.Request
	jsonResult *gjson.Result
}

func (r *RequestEvaluator) Header(args ...string) (string, error) {
	return r.Request.Header.Get(args[0]), nil
}

func (r *RequestEvaluator) Path(args ...string) (string, error) {
	vars := mux.Vars(r.Request)
	val, ok := vars[args[0]]
	if ok {
		return val, nil
	}
	return "", ErrNotFound
}

func (r *RequestEvaluator) Param(args ...string) (string, error) {
	values := r.Request.URL.Query()
	return values.Get(args[0]), nil
}

func (r *RequestEvaluator) Form(args ...string) (string, error) {
	return r.Request.FormValue(args[0]), nil
}

func (r *RequestEvaluator) GJson(args ...string) (string, error) {

	req := r.Request
	if r.jsonResult != nil {

		//read body
		data, err := io.ReadAll(req.Body)
		if err != nil {
			return "", err
		}
		defer req.Body.Close()

		//cache
		var x = gjson.Parse(string(data))
		r.jsonResult = &x
	}

	//get value
	return r.jsonResult.Get(args[0]).String(), nil
}
