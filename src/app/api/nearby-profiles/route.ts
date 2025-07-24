import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function GET(request: NextRequest) {
  // Extract userId from query parameters or auth header
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return Response.json(
      { error: 'ID de usuário não fornecido.' },
      { status: 400 }
    );
  }

  try {
    // Verify user exists and get their profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, latitude, longitude, gender_preference, min_age, max_age, max_distance, birth_date')
      .eq('id', userId)
      .single();

    if (profileError || !profileData) {
      console.error('Error fetching user profile:', profileError?.message);
      return Response.json(
        { error: 'Usuário não encontrado ou perfil incompleto.' },
        { status: 404 }
      );
    }

    if (!profileData.latitude || !profileData.longitude) {
      return Response.json(
        { error: 'Localização não configurada. Configure sua localização no perfil.' },
        { status: 400 }
      );
    }

    const preferences = {
      genderPreference: profileData.gender_preference || 'TODOS',
      minAge: profileData.min_age || 18,
      maxAge: profileData.max_age || 50,
      maxDistance: profileData.max_distance || 50,
    };

    // Fetch profiles with location and WhatsApp data
    let query = supabase
      .from('profiles')
      .select('id, name, avatar_url, gender, latitude, longitude, birth_date, whatsapp_number, share_whatsapp')
      .neq('id', userId)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (preferences.genderPreference !== 'TODOS') {
      query = query.eq('gender', preferences.genderPreference);
    }

    const { data: profilesData, error: profilesError } = await query;

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError.message);
      return Response.json(
        { error: 'Erro ao buscar perfis próximos.' },
        { status: 500 }
      );
    }

    if (!profilesData || profilesData.length === 0) {
      return Response.json({ profiles: [], message: 'Nenhum perfil encontrado.' });
    }

    // Fetch user's existing likes
    const { data: userLikes, error: likesError } = await supabase
      .from('likes')
      .select('liked_profile_id')
      .eq('profile_id', userId);

    if (likesError) {
      console.error('Error fetching user likes:', likesError.message);
      return Response.json(
        { error: 'Erro ao buscar curtidas do usuário.' },
        { status: 500 }
      );
    }

    const likedProfileIds = new Set(userLikes?.map((like) => like.liked_profile_id) || []);

    // Fetch mutual matches
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('profile1_id, profile2_id')
      .or(`profile1_id.eq.${userId},profile2_id.eq.${userId}`);

    if (matchesError) {
      console.error('Error fetching matches:', matchesError.message);
      return Response.json(
        { error: 'Erro ao buscar matches.' },
        { status: 500 }
      );
    }

    const matchedProfileIds = new Set(
      matchesData?.flatMap((match) =>
        match.profile1_id === userId ? match.profile2_id : match.profile1_id
      ) || []
    );

    // Filter profiles by age and add like/match status
    const filteredProfiles = profilesData
      .map((p) => {
        const birthDate = p.birth_date ? new Date(p.birth_date) : null;
        const age = birthDate
          ? Math.floor(
              (Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
            )
          : null;

        const isMatch = matchedProfileIds.has(p.id);

        return {
          ...p,
          age: age && age >= 18 ? age : null,
          isLiked: likedProfileIds.has(p.id),
          isMatch,
        };
      })
      .filter((p) => {
        return (
          p.age !== null &&
          p.age >= preferences.minAge &&
          p.age <= preferences.maxAge &&
          p.latitude !== null &&
          p.longitude !== null &&
          !p.isLiked // Exclude profiles already liked
        );
      });

    // Return filtered profiles and preferences
    return Response.json({
      profiles: filteredProfiles,
      preferences,
    });
  } catch (error: any) {
    console.error('Error in nearby-profiles API:', error.message);
    return Response.json(
      { error: 'Erro ao carregar perfis próximos. Por favor, entre em contato com o suporte.' },
      { status: 500 }
    );
  }
}