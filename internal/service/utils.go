package service

import (
	"math"
	"strconv"
	"strings"
	"time"
)

const KgToLb = 2.20462

func ToInt(value any) (int, bool) {
	switch v := value.(type) {
	case int:
		return v, true
	case int64:
		return int(v), true
	case float64:
		return int(v), true
	case string:
		n, err := strconv.Atoi(v)
		return n, err == nil
	}
	return 0, false
}

func FormatDateInTz(t time.Time, tz string) string {
	loc, err := time.LoadLocation(tz)
	if err != nil {
		return t.UTC().Format("2006-01-02")
	}
	return t.In(loc).Format("2006-01-02")
}

func FormatTimeInTz(t time.Time, tz string) string {
	loc, err := time.LoadLocation(tz)
	if err != nil {
		return t.UTC().Format("15:04")
	}
	return t.In(loc).Format("15:04")
}

func KgToLbs(kg float64) float64 {
	return math.Round(kg*KgToLb*10) / 10
}

func LbsToKg(lbs float64) float64 {
	if lbs <= 0 {
		return 0
	}
	return math.Round(lbs/KgToLb*100) / 100
}

type ParseWeightResult struct {
	Ok    bool
	Value float64
}

func ParseWeight(input string) ParseWeightResult {
	input = strings.TrimSpace(input)
	if input == "" {
		return ParseWeightResult{Ok: false}
	}
	normalized := strings.Replace(input, ",", ".", 1)
	if len(normalized) > 12 {
		return ParseWeightResult{Ok: false}
	}
	val, err := strconv.ParseFloat(normalized, 64)
	if err != nil || val <= 0 || val > 1500 || math.IsInf(val, 0) || math.IsNaN(val) {
		return ParseWeightResult{Ok: false}
	}
	return ParseWeightResult{Ok: true, Value: math.Round(val*100) / 100}
}

func SubtractDaysUTC(dateStr string, days int) string {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return dateStr
	}
	return t.AddDate(0, 0, -days).Format("2006-01-02")
}

func BuildDayOptionsBetween(startDateStr, endDateStr string, maxDays int) []string {
	start, err1 := time.Parse("2006-01-02", startDateStr)
	end, err2 := time.Parse("2006-01-02", endDateStr)
	if err1 != nil || err2 != nil {
		return nil
	}

	var days []string
	cursor := end
	for i := 0; i < maxDays; i++ {
		if cursor.Before(start) {
			break
		}
		days = append(days, cursor.Format("2006-01-02"))
		cursor = cursor.AddDate(0, 0, -1)
	}
	return days
}

func ContainsString(slice []string, s string) bool {
	for _, v := range slice {
		if v == s {
			return true
		}
	}
	return false
}
