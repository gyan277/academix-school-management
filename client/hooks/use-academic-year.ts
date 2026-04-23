import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './use-auth';

/**
 * Hook to get and manage the current academic year from school settings
 * Falls back to "2024/2025" if not set in database
 */
export function useAcademicYear() {
  const { profile } = useAuth();
  const [academicYear, setAcademicYear] = useState<string>("2024/2025");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAcademicYear = async () => {
      if (!profile?.school_id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('school_settings')
          .select('current_academic_year')
          .eq('id', profile.school_id)
          .single();

        if (error) {
          console.error('Error loading academic year:', error);
          // Keep default value
        } else if (data?.current_academic_year) {
          setAcademicYear(data.current_academic_year);
        }
      } catch (error) {
        console.error('Error loading academic year:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAcademicYear();
  }, [profile?.school_id]);

  return { academicYear, loading };
}
