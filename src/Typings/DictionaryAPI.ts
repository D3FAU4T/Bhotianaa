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
            synonyms: string[] | [];
            antonyms: string[] | [];
            example?: string;
        }[],
        synonyms: string[] | [],
        antonyms: string[] | []
    }[],
    license: {
        name: string; // CC BY-SA 3.0
        url: string; // https://creativecommons.org/licenses/by-sa/3.0
    },
    sourceUrls: string[]; // [ "https://en.wiktionary.org/wiki/hallelujah" ]
}