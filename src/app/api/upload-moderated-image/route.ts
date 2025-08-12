// app/api/upload-moderated-image/route.ts

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { RekognitionClient, DetectModerationLabelsCommand } from "@aws-sdk/client-rekognition"; // Exemplo com AWS Rekognition

// Função simulada de moderação - SUBSTITUA PELA SUA LÓGICA REAL
async function moderateImage(imageBuffer: Buffer): Promise<boolean> {
  // Exemplo com AWS Rekognition (requer configuração de variáveis de ambiente)
  try {
    const rekognitionClient = new RekognitionClient({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const command = new DetectModerationLabelsCommand({
      Image: { Bytes: imageBuffer },
      MinConfidence: 75,
    });

    const { ModerationLabels } = await rekognitionClient.send(command);

    if (ModerationLabels && ModerationLabels.length > 0) {
      console.log("Moderação reprovada:", ModerationLabels);
      return false; // Imagem reprovada
    }

    return true; // Imagem aprovada
  } catch (error) {
    console.error("Erro na moderação de imagem:", error);
    // Em caso de erro na API de moderação, decida se bloqueia ou permite. Bloquear é mais seguro.
    return false;
  }

  // Se não estiver usando um serviço real ainda, pode retornar true para testes.
  // console.log("Moderação de imagem pulada para desenvolvimento.");
  // return true;
}


export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const profileId = formData.get("profileId") as string | null;

    if (!file || !profileId) {
      return NextResponse.json({ error: "Arquivo ou ID do perfil faltando." }, { status: 400 });
    }
    
    // 1. Ler o arquivo e moderar o conteúdo
    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const isImageSafe = await moderateImage(imageBuffer);

    if (!isImageSafe) {
      return NextResponse.json({ error: "Conteúdo da imagem é inadequado." }, { status: 403 });
    }

    // 2. Se a imagem for segura, fazer o upload para o Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${profileId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("imagens") // Use o nome do seu bucket
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw uploadError;
    }
    
    // 3. Retornar o caminho do arquivo para o cliente
    return NextResponse.json({ storage_path: filePath }, { status: 200 });

  } catch (error) {
    console.error("Erro no upload:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno do servidor.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}