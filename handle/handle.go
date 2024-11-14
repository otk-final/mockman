package handle

import (
	"errors"
)

var (
	ErrNotFound = errors.New("value is not found")
	ErrArgs     = errors.New("args empty")
)
