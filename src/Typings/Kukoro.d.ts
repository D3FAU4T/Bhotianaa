export type CharacterType = "Bats" | "Cyclops" | "Dragon" | "Gargoyle" | "Goblin" | "Gorgon" | "Human" | "Imp" | "Lizard" | "Minotaur" | "Momba" | "Oni" | "Orc" | "Shadow" | "Skeleton" | "Slime" | "Spider" | "Troll" | "Wolf" | "Zombie";
export type GameTypes = "Dungeon" | "Sniper" | "OneTwoThree";

export interface KukoroData {
    KukoroModuleToggle: boolean,
    Kukoro: {
        Dungeon: {
            Active: boolean,
            Categories: Record<CharacterType | string, string[]>,
        },
        Sniper: {
            Active: boolean,
            FollowMode: boolean,
            Follower: string
        },
        OneTwoThree: {
            Active: boolean,
            Status: string
        }
    }
}

export const kukoroData: KukoroData = {
    KukoroModuleToggle: true,
    Kukoro: {
        Dungeon: {
            Active: true,
            Categories: {
                Bats: [],
                Cyclops: [],
                Dragon: [],
                Gargoyle: [],
                Goblin: [],
                Gorgon: [],
                Human: [],
                Imp: [],
                Lizard: [],
                Minotaur: [],
                Momba: [],
                Oni: [],
                Orc: [],
                Shadow: [],
                Skeleton: [],
                Slime: [],
                Spider: [],
                Troll: [],
                Wolf: [],
                Zombie: []
            }
        },
        Sniper: {
            Active: false,
            FollowMode: false,
            Follower: "Yo Mamma"
        },
        OneTwoThree: {
            Active: false,
            Status: "none"
        }
    }
}