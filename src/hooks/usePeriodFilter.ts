import { useCallback, useRef, useState, MutableRefObject } from 'react';
import { FilterMode } from '../components/MonthPicker';

export type ViewMode = 'activity' | 'budget';

export interface PeriodRefs {
  month:           MutableRefObject<string>;
  year:            MutableRefObject<string>;
  filterMode:      MutableRefObject<FilterMode>;
  viewMode:        MutableRefObject<ViewMode>;
  categoryFilters: MutableRefObject<string[]>;
}

export interface PeriodFilter {
  // Render-driving state
  month:              string;
  year:               string;
  filterMode:         FilterMode;
  viewMode:           ViewMode;
  categoryFilters:    string[];

  // Setters that keep the matching ref in sync. Use these everywhere — the
  // bare React setters won't update the ref, leading to stale reads in
  // useFocusEffect callbacks and other async paths.
  setMonth:           (m: string)     => void;
  setYear:            (y: string)     => void;
  setFilterMode:      (m: FilterMode) => void;
  setViewMode:        (v: ViewMode)   => void;
  setCategoryFilters: (ids: string[]) => void;

  // Read these inside async callbacks (useFocusEffect, etc.) where the
  // captured render-time state would be stale by the time the work runs.
  refs: PeriodRefs;

  // Convenience: returns the year derived from the current filter mode —
  // either the selected year (year mode) or the year prefix of the selected
  // month (month mode). Reads from refs so it's safe inside async paths.
  yearForCurrentPeriod: () => string;
}

/**
 * Encapsulates the month/year/filterMode/viewMode/categoryFilters state used
 * by the home, account-detail, and all-accounts screens. Exposes both the
 * render-driving state and refs that survive async re-entry — the prior
 * pattern of declaring 5 useState/useRef pairs per screen was fragile (easy
 * to forget to update one half).
 */
export function usePeriodFilter(): PeriodFilter {
  const [month,           setMonthState]           = useState('');
  const [year,            setYearState]            = useState('');
  const [filterMode,      setFilterModeState]      = useState<FilterMode>('month');
  const [viewMode,        setViewModeState]        = useState<ViewMode>('activity');
  const [categoryFilters, setCategoryFiltersState] = useState<string[]>([]);

  const monthRef           = useRef('');
  const yearRef            = useRef('');
  const filterModeRef      = useRef<FilterMode>('month');
  const viewModeRef        = useRef<ViewMode>('activity');
  const categoryFiltersRef = useRef<string[]>([]);

  const setMonth = useCallback((m: string) => {
    monthRef.current = m;
    setMonthState(m);
  }, []);

  const setYear = useCallback((y: string) => {
    yearRef.current = y;
    setYearState(y);
  }, []);

  const setFilterMode = useCallback((m: FilterMode) => {
    filterModeRef.current = m;
    setFilterModeState(m);
  }, []);

  const setViewMode = useCallback((v: ViewMode) => {
    viewModeRef.current = v;
    setViewModeState(v);
  }, []);

  const setCategoryFilters = useCallback((ids: string[]) => {
    categoryFiltersRef.current = ids;
    setCategoryFiltersState(ids);
  }, []);

  const yearForCurrentPeriod = useCallback(() => {
    if (filterModeRef.current === 'year') return yearRef.current;
    return monthRef.current.slice(0, 4);
  }, []);

  return {
    month, year, filterMode, viewMode, categoryFilters,
    setMonth, setYear, setFilterMode, setViewMode, setCategoryFilters,
    refs: {
      month:           monthRef,
      year:            yearRef,
      filterMode:      filterModeRef,
      viewMode:        viewModeRef,
      categoryFilters: categoryFiltersRef,
    },
    yearForCurrentPeriod,
  };
}
