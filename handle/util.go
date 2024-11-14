package handle

import (
	"github.com/google/uuid"
	"math/rand"
	"strconv"
)

type UtilEvaluator struct {
}

func (u *UtilEvaluator) Rand(args ...string) (string, error) {
	strMin, strMax := args[0], args[1]
	numMin, err := strconv.Atoi(strMin)
	if err != nil {
		return "", ErrArgs
	}
	numMax, err := strconv.Atoi(strMax)
	if err != nil {
		return "", ErrArgs
	}
	val := rand.Intn(numMax-numMin+1) + numMin
	return strconv.Itoa(val), nil
}

func (u *UtilEvaluator) Uuid(args ...string) (string, error) {
	return uuid.New().String(), nil
}
