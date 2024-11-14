package api

import (
	"github.com/samber/lo"
	"strings"
)

type KVField struct {
	Index       uint   `json:"index,omitempty"`
	Selected    bool   `json:"selected,omitempty"`
	Key         string `json:"key,omitempty"`
	Value       string `json:"value,omitempty"`
	Description string `json:"description,omitempty"`
}

type KVFields []KVField

func (r KVFields) Get(key string) (KVField, bool) {
	return lo.Find(r, func(item KVField) bool {
		return strings.EqualFold(item.Key, key) && item.Value != ""
	})
}

func (r KVFields) Paris() []string {
	var paris = make([]string, 0)
	for _, v := range r {
		paris = append(paris, v.Key, v.Value)
	}
	return paris
}

type Workspace struct {
	Id       string `json:"id,omitempty"`
	Name     string `json:"name,omitempty"`
	Host     string `json:"host,omitempty"`
	Endpoint string `json:"endpoint,omitempty"`
}

type File struct {
	Path   string `json:"path,omitempty"`
	Name   string `json:"name,omitempty"`
	Format string `json:"format,omitempty"`
}
