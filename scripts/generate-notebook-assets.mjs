// リザルト画面(採集ノート案)用の装飾パーツを Gemini(nano banana / gemini-2.5-flash-image)で生成する。
// 実行: npm run assets:generate
// 事前準備: リポジトリ直下に .env を作成し GEMINI_API_KEY=... を設定しておく(.env は .gitignore 済み)。
//
// 生成結果は public/assets には置かず、レビュー用に public/assets/_generated/ へ書き出す。
// 気に入ったものだけ、確認のうえで public/assets/ へ手動で移動すること。

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const MODEL = "gemini-2.5-flash-image";
const API_KEY = process.env.GEMINI_API_KEY;
const OUT_DIR = path.resolve("public/assets/_generated");
const REFERENCE_IMAGES = [
    "public/assets/notebook.png",
    "public/assets/sticky.png",
];

const STYLE_GUIDE = `添付した notebook.png(クラフト紙のスパイラルノート)と sticky.png(テープ留めのメモ用紙)と
同じ画風で作ってください。フラットな紙工作(ペーパークラフト)風、水彩のにじみをうっすら乗せた質感、
彩度は抑えめでゲーム全体のクラフト紙・パステルカラーのトーンに合わせること。背景は透過、影は薄く柔らかく。
余計な文字やロゴは入れないこと。`;

const TASKS = [
    {
        name: "specimen-pin",
        prompt: `${STYLE_GUIDE}\n\n標本用の画鋲を1つだけ、透過PNGで作ってください。真上から見た金属ピン。頭は少しくすんだシルバー、フラットなイラスト調。`,
    },
    {
        name: "specimen-tag",
        prompt: `${STYLE_GUIDE}\n\n標本ラベルタグを1つだけ、透過PNGで作ってください。クラフト紙の小さな付箋/タグで、上に細い糸か紐が少しだけ見える。中は無地(文字なし)。`,
    },
    {
        name: "new-record-ribbon",
        prompt: `${STYLE_GUIDE}\n\n「NEW RECORD」用の小さなリボン/バッジを1つだけ、透過PNGで作ってください。マット金のスタンプ風。中央は無地(文字なし、あとで手書き文字を重ねる余白として空けておく)。`,
    },
];

async function toInlineImagePart(filePath) {
    const bytes = await readFile(filePath);
    return {
        inlineData: {
            mimeType: "image/png",
            data: bytes.toString("base64"),
        },
    };
}

async function generateOne(task, referenceParts) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const body = {
        contents: [
            {
                role: "user",
                parts: [...referenceParts, { text: task.prompt }],
            },
        ],
    };

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`[${task.name}] API error ${res.status}: ${errText}`);
    }

    const json = await res.json();
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData?.data);

    if (!imagePart) {
        throw new Error(
            `[${task.name}] レスポンスに画像データが含まれていません: ${JSON.stringify(json)}`,
        );
    }

    const outPath = path.join(OUT_DIR, `${task.name}.png`);
    await writeFile(outPath, Buffer.from(imagePart.inlineData.data, "base64"));
    console.log(`saved: ${outPath}`);
}

async function main() {
    if (!API_KEY) {
        console.error(
            "GEMINI_API_KEY が設定されていません。.env に GEMINI_API_KEY=... を書いてから\n" +
                "`npm run assets:generate` を実行してください(.env は git 管理外です)。",
        );
        process.exitCode = 1;
        return;
    }

    await mkdir(OUT_DIR, { recursive: true });
    const referenceParts = await Promise.all(
        REFERENCE_IMAGES.map(toInlineImagePart),
    );

    for (const task of TASKS) {
        try {
            await generateOne(task, referenceParts);
        } catch (err) {
            console.error(err.message);
        }
    }
}

main();
