package handler

import (
	"testing"
)

func TestSanitizeDateRange(t *testing.T) {
	tests := []struct {
		name      string
		start     string
		end       string
		fallback  int
		wantStart string
		wantEnd   string
	}{
		{
			"fallback range with explicit end",
			"", "2025-03-15", 14,
			"2025-03-02", "2025-03-15",
		},
		{
			"clamps start to end when start > end",
			"2025-04-01", "2025-03-15", 14,
			"2025-03-15", "2025-03-15",
		},
		{
			"respects explicit start and end",
			"2025-03-01", "2025-03-10", 14,
			"2025-03-01", "2025-03-10",
		},
		{
			"clamps start to max lookback",
			"2020-01-01", "2025-03-15", 14,
			"2024-09-17", "2025-03-15",
		},
		{
			"month boundaries",
			"", "2025-03-01", 2,
			"2025-02-28", "2025-03-01",
		},
		{
			"leap year",
			"", "2024-03-01", 2,
			"2024-02-29", "2024-03-01",
		},
		{
			"year boundaries",
			"", "2025-01-01", 3,
			"2024-12-30", "2025-01-01",
		},
		{
			"ignores malformed start",
			"not-a-date", "2025-03-15", 7,
			"2025-03-09", "2025-03-15",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			start, end := sanitizeDateRange(tt.start, tt.end, tt.fallback, "UTC")
			if start != tt.wantStart {
				t.Errorf("start = %q, want %q", start, tt.wantStart)
			}
			if end != tt.wantEnd {
				t.Errorf("end = %q, want %q", end, tt.wantEnd)
			}
		})
	}
}

func TestSanitizeDateRangeFutureEnd(t *testing.T) {
	_, end := sanitizeDateRange("", "2099-12-31", 7, "UTC")
	if end == "2099-12-31" {
		t.Error("future end date should be clamped to today")
	}
}
