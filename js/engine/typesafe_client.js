/**
 * TypeSafe AI System One Client - UDE-001
 * Integrates calibrated Decision Models for visual logo bounding box detection (Box)
 * and ambiguous section classification (Choice).
 */

export function buildTypeSafeBoxPayload(imageDataUrl, promptText = 'Where is the logo or letterhead emblem in this document?') {
    return {
        question: {
            type: 'box',
            prompt: promptText
        },
        state: {
            image: imageDataUrl
        }
    };
}

export function buildTypeSafeChoicePayload(textSnippet, choices = ['kop', 'nomor', 'perihal', 'penerima', 'isi', 'penutup', 'ttd'], promptText = 'What section of an Indonesian official letter is this?') {
    return {
        question: {
            type: 'choice',
            prompt: promptText,
            choices: choices
        },
        state: {
            text: textSnippet
        }
    };
}

export function parseTypeSafeBoxResponse(response, viewportWidth = 595, viewportHeight = 842) {
    if (!response || !response.answer || !Array.isArray(response.answer.box)) {
        return null;
    }
    const [ymin, xmin, ymax, xmax] = response.answer.box;
    const x = Math.round(xmin * viewportWidth);
    const y = Math.round(ymin * viewportHeight);
    const width = Math.round((xmax - xmin) * viewportWidth);
    const height = Math.round((ymax - ymin) * viewportHeight);
    return { x, y, width, height };
}

export async function askTypeSafe(payload, apiKey) {
    const key = apiKey || (typeof localStorage !== 'undefined' ? localStorage.getItem('TYPESAFE_API_KEY') : null);
    if (!key) {
        throw new Error('TypeSafe API Key belum dikonfigurasi. Silakan simpan API Key di localStorage.');
    }

    const res = await fetch('https://api.typesafe.ai/v1/ask', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`TypeSafe API error (${res.status}): ${errText}`);
    }

    return await res.json();
}
