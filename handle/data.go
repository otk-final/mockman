package handle

import (
	"encoding/base64"
	"encoding/hex"
)

type EncodeEvaluator struct {
}

func (e *EncodeEvaluator) Encoded(args ...string) (string, error) {
	method, target := args[0], args[1]
	if method == "base64" {
		return base64.StdEncoding.EncodeToString([]byte(target)), nil
	}
	if method == "hex" {
		return hex.EncodeToString([]byte(target)), nil
	}
	return "", ErrArgs
}
