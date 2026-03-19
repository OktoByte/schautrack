package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthEndpointShuttingDown(t *testing.T) {
	// Mark shutting down
	shuttingDown.Store(true)
	defer shuttingDown.Store(false)

	h := Health(nil, "test")
	r := httptest.NewRequest("GET", "/api/health", nil)
	w := httptest.NewRecorder()
	h(w, r)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("status = %d, want 503", w.Code)
	}

	var resp map[string]any
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["status"] != "shutting_down" {
		t.Errorf("status = %v, want shutting_down", resp["status"])
	}
}
