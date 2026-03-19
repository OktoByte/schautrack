package handler

import (
	"github.com/alexedwards/argon2id"
)

func argon2idCreateHash(password string) (string, error) {
	return argon2id.CreateHash(password, argon2id.DefaultParams)
}

func argon2idCompareHashAndPassword(hash, password string) (bool, error) {
	return argon2id.ComparePasswordAndHash(password, hash)
}
