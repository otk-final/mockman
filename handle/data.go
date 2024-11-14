package handle

import (
	"encoding/base64"
	"io"
	"net/http"
	"os"
	"strings"
)

type EncodeEvaluator struct {
}

func (e *EncodeEvaluator) Base64(args ...string) (string, error) {

	path := args[0]
	if strings.HasPrefix(path, "http") {
		resp, err := http.Get(args[0])
		if err != nil {
			return "", err
		}
		defer resp.Body.Close()
		data, _ := io.ReadAll(resp.Body)
		return base64.StdEncoding.EncodeToString(data), nil
	}

	//native file
	data, err := os.ReadFile(args[0])
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(data), nil
}
