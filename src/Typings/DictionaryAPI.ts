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

interface OxfordRegularBlock {
    id: string;
    text: string;
}

interface OxfordRegularWithTypes extends OxfordRegularBlock {
    type: string;
}

interface OxfordContextBlock {
    domains: OxfordRegularBlock[];
    id: string;
    language: string;
    regions: OxfordRegularBlock[];
    registers: OxfordRegularBlock[];
    text: string;
}

interface OxfordPronounciation {
    audioFile: string;
    dialects: string[];
    phoneticNotation: string;
    phoneticSpelling: string;
    regions: OxfordRegularBlock[];
    registers: OxfordRegularBlock[];
}

interface OxfordInflection {
    domains: OxfordRegularBlock[];
    grammaticalFeatures: OxfordRegularWithTypes[];
    inflectedForm: string;
    lexicalCategory: OxfordRegularBlock[];
    pronunciations: OxfordPronounciation[],
    regions: OxfordRegularBlock[];
    registers: OxfordRegularBlock[];
}

interface OxfordVariantForms {
    domains: OxfordRegularBlock[];
    notes: OxfordRegularWithTypes[];
    pronunciations: OxfordPronounciation[];
    regions: OxfordRegularBlock[];
    registers: OxfordRegularBlock[];
    text: string;
}
export interface OxfordDictionaryAPI {
    metadata: {},
    results: {
        id: string;
        language: string;
        lexicalEntries: {
            compounds: OxfordContextBlock[];
            derivativeOf: OxfordContextBlock[];
            derivatives: OxfordContextBlock[];
            entries: {
                crossReferenceMarkers: string[];
                crossReferences: OxfordRegularWithTypes[];
                etymologies: string[];
                grammaticalFeatures: OxfordRegularWithTypes[];
                homographNumber: string;
                inflections: OxfordInflection[],
                notes: OxfordRegularWithTypes[];
                pronunciations: OxfordPronounciation[];
                senses: {
                    antonyms: {
                        domains: OxfordRegularBlock[];
                        id: string;
                        language: string;
                        regions: OxfordRegularBlock[];
                        registers: OxfordRegularBlock[];
                        text: string;
                    }[];
                    constructions: {
                        domains: OxfordRegularBlock[];
                        examples: string[][];
                        notes: OxfordRegularWithTypes[],
                        regions: OxfordRegularBlock[];
                        registers: OxfordRegularBlock[];
                        text: string;
                    }[];
                    crossReferenceMarkers: string[];
                    crossReferences: OxfordRegularWithTypes[];
                    definitions: string[]
                    domainClasses: OxfordRegularBlock[];
                    domains: OxfordRegularBlock[];
                    etymologies: string[];
                    examples: {
                        definitions: string[];
                        domains: OxfordRegularBlock[];
                        notes: OxfordRegularWithTypes[];
                        regions: OxfordRegularBlock[];
                        registers: OxfordRegularBlock[];
                        senseIds: string[]
                        text: string;
                    }[];
                    id: string;
                    inflections: OxfordInflection[];
                    notes: OxfordRegularWithTypes[];
                    pronunciations: OxfordPronounciation[],
                    regions: OxfordRegularBlock[];
                    registers: OxfordRegularBlock[];
                    semanticClasses: OxfordRegularBlock[];
                    shortDefinitions: string[];
                    subsenses: {}[]
                    synonyms: {
                        domains: OxfordRegularBlock[];
                        id: string;
                        language: string;
                        regions: OxfordRegularBlock[]
                        registers: OxfordRegularBlock[];
                        text: string;
                    }[];
                    thesaurusLinks: {
                        entry_id: string;
                        sense_id: string;
                    }[];
                    variantForms: OxfordVariantForms[];
                }[];
                variantForms: OxfordVariantForms[];
            }[];
            grammaticalFeatures: OxfordRegularWithTypes[];
            language: string;
            lexicalCategory: OxfordRegularBlock[];
            notes: OxfordRegularWithTypes[];
            phrasalVerbs: {
                domains: OxfordRegularBlock[];
                id: string;
                language: string;
                regions: OxfordRegularBlock[];
                registers: OxfordRegularBlock[];
                text: string;
            }[];
            phrases: {
                domains: OxfordRegularBlock[];
                id: string;
                language: string;
                regions: OxfordRegularBlock[];
                registers: OxfordRegularBlock[];
                text: string;
            }[];
            pronunciations: OxfordPronounciation[];
            root: string;
            text: string;
            variantForms: OxfordVariantForms[];
        }[];
        pronunciations: OxfordPronounciation[];
        type: string;
        word: string;
    }[];
}