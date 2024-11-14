package handle

import (
	"log"
	"net/url"
	"sync/atomic"
	"testing"
)

type Hold struct {
	inc atomic.Uint32
}

func (h *Hold) Title(args ...string) int {
	h.inc.Add(1)
	log.Printf("inc :%v", h.inc.Load())
	return 13
}

func TestTemplate(t *testing.T) {

	u, err := url.Parse("/xss/x?a=xx&a=xx1")
	for k, v := range u.Query() {
		t.Logf("%s=%s", k, v)
	}
	if err != nil {
		t.Error(err)
	}
	t.Log(u)
}
