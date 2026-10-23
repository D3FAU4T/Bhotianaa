export interface FreeDictionaryAPISense {
    definition: string;
    tags?: string[];
    examples?: string[];
    quotes?: string[];
    synonyms?: string[];
    antonyms?: string[];
    subsenses?: FreeDictionaryAPISense[];
}

export interface FreeDictionaryAPIEntry {
    language?: {
        code: string;
        name: string;
    };
    partOfSpeech?: string;
    pronunciations?: any[];
    forms?: any[];
    senses: FreeDictionaryAPISense[];
    synonyms?: string[];
    antonyms?: string[];
}

export interface FreeDictionaryAPIResponse {
    word: string;
    entries: FreeDictionaryAPIEntry[];
    source?: {
        url?: string;
        license?: {
            name: string;
            url: string;
        };
    };
    message?: string;
}

export interface DictionaryAPI {
    word: string;
    phonetic: string;
    phonetics: {
        text: string;
        audio: "" | string;
        sourceUrl?: string;
        license?: {
            name: string;
            url: string;
        }
    }[],
    meanings: {
        partOfSpeech: "interjection" | "verb" | "noun";
        definitions: {
            definition: string;
            synonyms: string[];
            antonyms: string[];
            example?: string;
        }[],
        synonyms: string[],
        antonyms: string[]
    }[],
    license: {
        name: string; // CC BY-SA 3.0
        url: string; // https://creativecommons.org/licenses/by-sa/3.0
    },
    sourceUrls: string[]; // [ "https://en.wiktionary.org/wiki/hallelujah" ]
}

export interface DictionaryAPIError {
    title: string;
    message: string;
    resolution: string;
}
