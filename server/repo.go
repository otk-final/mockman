package server

import (
	"encoding/json"
	"github.com/tidwall/buntdb"
	"mockman/api"
)

type ApiRepos map[string]*ApiRepo

type ApiRepo struct {
	collectionConn *buntdb.DB
	pathConn       *buntdb.DB
}

func NewApiRepo(collectionConn *buntdb.DB, pathConn *buntdb.DB) *ApiRepo {

	_ = pathConn.CreateIndex("id", "*", buntdb.IndexJSON("id"))
	_ = pathConn.CreateIndex("name", "*", buntdb.IndexJSON("name"))
	_ = pathConn.CreateIndex("path", "*", buntdb.IndexJSON("path"))

	return &ApiRepo{
		collectionConn: collectionConn,
		pathConn:       pathConn,
	}
}

func (r *ApiRepo) info(id string) (*api.Define, error) {
	var define = &api.Define{}

	err := r.pathConn.View(func(tx *buntdb.Tx) error {
		val, err := tx.Get(id)
		if err != nil {
			return err
		}
		_ = json.Unmarshal([]byte(val), define)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return define, nil
}

func (r *ApiRepo) list() ([]*api.Define, error) {
	apis := make([]*api.Define, 0)

	err := r.pathConn.View(func(tx *buntdb.Tx) error {
		return tx.Ascend("", func(key, value string) bool {
			define := &api.Define{}
			err := json.Unmarshal([]byte(value), define)
			if err != nil {
				return false
			}
			define.Id = key
			apis = append(apis, define)
			return true
		})
	})
	if err != nil {
		return nil, err
	}
	return apis, nil
}

func (r *ApiRepo) remove(id string) error {
	return r.pathConn.Update(func(tx *buntdb.Tx) error {
		_, err := tx.Delete(id)
		return err
	})
}

func (r *ApiRepo) save(define *api.Define) error {
	_ = r.remove(define.Id)

	return r.pathConn.Update(func(tx *buntdb.Tx) error {
		val, _ := json.Marshal(define)
		_, _, err := tx.Set(define.Id, string(val), nil)
		return err
	})
}
