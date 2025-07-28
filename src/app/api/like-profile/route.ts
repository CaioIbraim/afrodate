import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const profileId = formData.get('profileId') as string;
    const targetProfileId = formData.get('targetProfileId') as string;

    if (!profileId || !targetProfileId) {
      return NextResponse.json(
        { error: 'ID do usuário ou perfil alvo não fornecido.' },
        { status: 400 }
      );
    }

    // Insert like
    const { error: likeError } = await supabase
      .from('likes')
      .insert({ profile_id: profileId, liked_profile_id: targetProfileId });

    if (likeError) {
      console.error('Error liking profile:', likeError.message);
      return NextResponse.json(
        { error: 'Não foi possível curtir o perfil. Por favor, entre em contato com o suporte.' },
        { status: 500 }
      );
    }

    // Check for mutual like
    const { data: mutualLike, error: mutualLikeError } = await supabase
      .from('likes')
      .select('id')
      .eq('profile_id', targetProfileId)
      .eq('liked_profile_id', profileId)
      .single();

    if (mutualLikeError && mutualLikeError.code !== 'PGRST116') {
      console.error('Error checking mutual like:', mutualLikeError.message);
      return NextResponse.json(
        { error: 'Erro ao verificar curtida mútua. Por favor, entre em contato com o suporte.' },
        { status: 500 }
      );
    }

    let message = 'Você curtiu este perfil!';
    if (mutualLike) {
      // Create match
      const { error: matchError } = await supabase.from('matches').insert({
        profile1_id: profileId < targetProfileId ? profileId : targetProfileId,
        profile2_id: profileId < targetProfileId ? targetProfileId : profileId,
      });

      if (matchError) {
        console.error('Error creating match:', matchError.message);
        return NextResponse.json(
          { error: 'Erro ao criar match. Por favor, entre em contato com o suporte.' },
          { status: 500 }
        );
      }
      message = 'Parabéns! Você deu match com este perfil!';
    }

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error('Error in like-profile:', error.message);
    return NextResponse.json(
      { error: 'Não foi possível curtir o perfil. Por favor, entre em contato com o suporte.' },
      { status: 500 }
    );
  }
}