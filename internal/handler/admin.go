package handler

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"schautrack/internal/database"
	"schautrack/internal/middleware"
)

type AdminHandler struct {
	Pool     *pgxpool.Pool
	Settings *database.SettingsCache
}

var allowedAdminKeys = map[string]string{
	"support_email":  "SUPPORT_EMAIL",
	"imprint_address": "IMPRINT_ADDRESS",
	"imprint_email":  "IMPRINT_EMAIL",
	"enable_legal":   "ENABLE_LEGAL",
	"ai_provider":    "AI_PROVIDER",
	"ai_key":         "AI_KEY",
	"ai_endpoint":    "AI_ENDPOINT",
	"ai_model":       "AI_MODEL",
	"ai_daily_limit": "AI_DAILY_LIMIT",
}

// UpdateSettings handles POST /admin/settings
func (h *AdminHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Key      string            `json:"key"`
		Value    string            `json:"value"`
		Settings map[string]string `json:"settings"`
	}
	if err := ReadJSON(r, &body); err != nil {
		ErrorJSON(w, http.StatusBadRequest, "Invalid request.")
		return
	}

	// Batch mode
	if body.Settings != nil {
		for k := range body.Settings {
			envVar, ok := allowedAdminKeys[k]
			if !ok {
				ErrorJSON(w, http.StatusBadRequest, fmt.Sprintf("Invalid setting key: %s", k))
				return
			}
			if os.Getenv(envVar) != "" {
				ErrorJSON(w, http.StatusBadRequest, fmt.Sprintf("Setting '%s' is controlled by environment variable.", k))
				return
			}
		}
		for k, v := range body.Settings {
			if err := h.Settings.SetAdminSetting(r.Context(), k, v); err != nil {
				ErrorJSON(w, http.StatusInternalServerError, "Failed to update settings.")
				return
			}
		}
		JSON(w, http.StatusOK, map[string]any{"ok": true, "message": "Settings updated."})
		return
	}

	// Single mode
	envVar, ok := allowedAdminKeys[body.Key]
	if !ok {
		ErrorJSON(w, http.StatusBadRequest, "Invalid setting key.")
		return
	}
	if os.Getenv(envVar) != "" {
		ErrorJSON(w, http.StatusBadRequest, "This setting is controlled by environment variable.")
		return
	}
	if err := h.Settings.SetAdminSetting(r.Context(), body.Key, body.Value); err != nil {
		ErrorJSON(w, http.StatusInternalServerError, "Failed to update setting.")
		return
	}
	JSON(w, http.StatusOK, map[string]any{"ok": true, "message": "Setting updated."})
}

// DeleteUser handles POST /admin/users/:id/delete
func (h *AdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	userID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		ErrorJSON(w, http.StatusBadRequest, "Invalid user ID.")
		return
	}

	currentUser := middleware.GetCurrentUser(r)
	if userID == currentUser.ID {
		ErrorJSON(w, http.StatusBadRequest, "Cannot delete yourself.")
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		ErrorJSON(w, http.StatusInternalServerError, "Failed to delete user.")
		return
	}
	defer tx.Rollback(r.Context())

	tables := []string{
		"DELETE FROM calorie_entries WHERE user_id = $1",
		"DELETE FROM weight_entries WHERE user_id = $1",
		"DELETE FROM ai_usage WHERE user_id = $1",
		"DELETE FROM account_links WHERE requester_id = $1 OR target_id = $1",
		"DELETE FROM password_reset_tokens WHERE user_id = $1",
		"DELETE FROM email_verification_tokens WHERE user_id = $1",
		"DELETE FROM users WHERE id = $1",
	}
	for _, q := range tables {
		if _, err := tx.Exec(r.Context(), q, userID); err != nil {
			ErrorJSON(w, http.StatusInternalServerError, "Failed to delete user.")
			return
		}
	}
	// Clean up sessions
	if _, err := tx.Exec(r.Context(), `DELETE FROM "session" WHERE (sess::jsonb->>'userId')::int = $1`, userID); err != nil {
		ErrorJSON(w, http.StatusInternalServerError, "Failed to delete user.")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		ErrorJSON(w, http.StatusInternalServerError, "Failed to delete user.")
		return
	}
	JSON(w, http.StatusOK, map[string]any{"ok": true, "message": "User deleted completely."})
}

// Suppress unused
var _ = strings.TrimSpace
