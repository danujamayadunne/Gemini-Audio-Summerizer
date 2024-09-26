import { NextResponse } from 'next/server';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || '');

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {

        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }

        const reader = request.body?.getReader();
        if (!reader) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        let fileData: Uint8Array[] = [];
        let done = false;

        while (!done) {
            const { done: isDone, value } = await reader.read();
            done = isDone;

            if (value) {
                fileData.push(value);
            }
        }

        const buffer = Buffer.concat(fileData);
        const uploadPath = path.join(uploadDir, `audiofile-${Date.now()}.mp3`);

        await fs.promises.writeFile(uploadPath, buffer);

        const uploadResult = await fileManager.uploadFile(uploadPath, {
            mimeType: 'audio/mp3',
            displayName: 'Uploaded Audio',
        });

        let uploadedFile = await fileManager.getFile(uploadResult.file.name);

        while (uploadedFile.state === FileState.PROCESSING) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            uploadedFile = await fileManager.getFile(uploadResult.file.name);
        }

        if (uploadedFile.state === FileState.FAILED) {
            throw new Error('Audio processing failed.');
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

        const result = await model.generateContent([
            {
                fileData: {
                    fileUri: uploadedFile.uri,
                    mimeType: uploadedFile.mimeType,
                },
            },
            {
                text: "Please summarize this audio. Include the main points and key takeaways and use bold texts for special texts. The summerize is for the undergraduate students to learn the lecture without listening to the whole audio. The summery should have all the key points and takeaways from the audio. Don't say about undergraduate students in the summary. The summary should be in a way that the students can understand the lecture without listening to the whole audio. Dont ask question from the user. Dont include greetings.",
            }
        ]);

        await fs.promises.unlink(uploadPath);

        return NextResponse.json({ summary: result.response.text() });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Error summarizing the audio' }, { status: 500 });
    }
}
