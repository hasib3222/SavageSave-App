import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './useAuth';
import MONETIZATION from '../config/monetization';
import { PLAN_IDS, getPlanFeatures, getPlanMeta } from '../plans/planConfig';

/**
 * useSubscription
 * =====================================
 * Fetches and caches the current user's subscription tier from Supabase.
 * Falls back to FREE plan when monetization is disabled or user is guest.
 * Gracefully handles missing tables (pre-launch safety).
 */
export function useSubscription() {
  const { user } = useAuth();
  const [planId, setPlanId] = useState(PLAN_IDS.FREE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubscription = useCallback(async () => {
    // Monetization disabled = show Free badge, but all features unlocked (no enforcement)
    if (!MONETIZATION.monetization_enabled && !MONETIZATION.admin_override) {
      setPlanId(PLAN_IDS.FREE);
      setLoading(false);
      return;
    }

    // Guest users default to FREE when monetization is on
    if (!user) {
      setPlanId(PLAN_IDS.FREE);
      setLoading(false);
      return;
    }

    try {
      // Attempt to fetch subscription from Supabase
      // Table: subscriptions(user_id, plan_id, status, current_period_end)
      const { data, error: dbError } = await supabase
        .from('subscriptions')
        .select('plan_id, status, current_period_end')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (dbError) {
        // Table may not exist yet (pre-launch) — silently default to FREE
        setPlanId(PLAN_IDS.FREE);
        setError(null);
      } else if (data) {
        const validPlan = Object.values(PLAN_IDS).includes(data.plan_id)
          ? data.plan_id
          : PLAN_IDS.FREE;
        setPlanId(validPlan);
      } else {
        setPlanId(PLAN_IDS.FREE);
      }
    } catch (err) {
      setPlanId(PLAN_IDS.FREE);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const features = getPlanFeatures(planId);
  const meta = getPlanMeta(planId);

  return {
    planId,
    features,
    meta,
    loading,
    error,
    isFree: planId === PLAN_IDS.FREE,
    isPro: planId === PLAN_IDS.PRO,
    isUltra: planId === PLAN_IDS.ULTRA,
    refresh: fetchSubscription,
  };
}
