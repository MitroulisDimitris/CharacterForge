"""Build public/monster-icons.json: one small icon for every SRD monster in the Lookup.

Icons come from game-icons.net (https://github.com/game-icons/icons, CC BY 3.0; the credit line
is shown in the Lookup). Each monster gets an icon by name (rules below, first match wins) or,
failing that, one for its creature type.

    python scripts/monster-icons.py
"""
import json, os, re, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "monster-icons.json")
RAW = "https://raw.githubusercontent.com/game-icons/icons/master/{}.svg"
SRD = "https://api.open5e.com/v1/monsters/?document__slug=wotc-srd&limit=500&fields=slug,name,type"

# (regex on the lower-case name, icon path). Most specific first.
RULES = [
    (r"dragon turtle", "lorc/turtle"),
    (r"half-red dragon", "lorc/dragon-breath"),
    (r"pseudodragon", "lorc/wyvern"),
    (r"wyrmling", "faithtoken/dragon-head"),
    (r"dragon", "lorc/dragon-head"),
    (r"wyvern", "lorc/wyvern"),
    (r"swarm of bats", "delapouite/bat"),
    (r"swarm of beetles", "delapouite/flying-beetle"),
    (r"swarm of centipedes", "lorc/centipede"),
    (r"swarm of insects", "lorc/insect-jaws"),
    (r"swarm of (poisonous )?snakes", "lorc/snake"),
    (r"swarm of quippers|quipper", "delapouite/piranha"),
    (r"swarm of rats", "delapouite/rat"),
    (r"swarm of ravens", "lorc/raven"),
    (r"swarm of spiders", "lorc/spider-web"),
    (r"swarm of wasps|giant wasp", "lorc/wasp-sting"),
    (r"minotaur skeleton", "lorc/horned-skull"),
    (r"warhorse skeleton", "lorc/animal-skull"),
    (r"skeleton", "skoll/skeleton"),
    (r"ogre zombie|zombie", "delapouite/shambling-zombie"),
    (r"mummy", "delapouite/mummy-head"),
    (r"vampire", "delapouite/vampire-dracula"),
    (r"lich", "lorc/grim-reaper"),
    (r"ghost", "lorc/ghost"),
    (r"specter|wraith", "lorc/spectre"),
    (r"shadow", "lorc/shadow-follower"),
    (r"ghoul|ghast", "lorc/chewed-skull"),
    (r"wight", "lorc/broken-skull"),
    (r"will-o'-wisp", "lorc/lantern-flame"),
    (r"winter wolf|dire wolf", "lorc/direwolf"),
    (r"werewolf", "lorc/werewolf"),
    (r"wererat", "delapouite/rat"),
    (r"wereboar", "caro-asercion/boar"),
    (r"weretiger", "delapouite/tiger-head"),
    (r"owlbear", "caro-asercion/barn-owl"),
    (r"bearded devil", "delapouite/devil-mask"),
    (r"bugbear", "delapouite/brute"),
    (r"werebear|polar bear", "cathelineau/polar-bear"),
    (r"black bear", "sparker/bear-face"),
    (r"bear", "delapouite/bear-head"),
    (r"wolf spider|giant spider|^spider$", "lorc/hanging-spider"),
    (r"phase spider", "lorc/masked-spider"),
    (r"ettercap", "carl-olsen/spider-face"),
    (r"drider", "carl-olsen/spider-alt"),
    (r"worg|wolf|jackal", "lorc/wolf-head"),
    (r"death dog|blink dog|mastiff", "lorc/hound"),
    (r"hell hound", "lorc/hound"),
    (r"hyena|gnoll", "caro-asercion/hyena-head"),
    (r"saber-toothed", "delapouite/saber-toothed-cat-head"),
    (r"tiger", "delapouite/tiger-head"),
    (r"^cat$", "lorc/cat"),
    (r"lion|panther", "lorc/lion"),
    (r"giant ape|^ape$|baboon", "delapouite/gorilla"),
    (r"badger", "caro-asercion/badger"),
    (r"weasel", "caro-asercion/fox"),
    (r"bat$", "delapouite/bat"),
    (r"boar", "caro-asercion/boar"),
    (r"camel", "delapouite/camel-head"),
    (r"centipede", "lorc/centipede"),
    (r"crab", "lorc/crab"),
    (r"crocodile", "lorc/croc-jaws"),
    (r"deer|elk", "caro-asercion/deer-head"),
    (r"eagle|griffon|hippogriff", "delapouite/eagle-head"),
    (r"blood hawk|hawk", "lorc/hawk-emblem"),
    (r"elephant", "delapouite/elephant-head"),
    (r"mammoth", "delapouite/mammoth"),
    (r"frog|toad", "lorc/frog"),
    (r"goat", "skoll/goat"),
    (r"pegasus", "skoll/pegasus"),
    (r"unicorn", "delapouite/unicorn"),
    (r"nightmare", "lorc/horse-head"),
    (r"sea horse", "delapouite/seahorse"),
    (r"horse|pony|mule|warhorse", "delapouite/horse-head"),
    (r"lizardfolk", "lorc/lizardman"),
    (r"lizard", "lorc/gecko"),
    (r"octopus", "lorc/octopus"),
    (r"owl", "lorc/owl"),
    (r"^rat$|giant rat", "delapouite/rat"),
    (r"raven", "lorc/raven"),
    (r"vulture", "lorc/vulture"),
    (r"rhinoceros", "delapouite/rhinoceros-horn"),
    (r"scorpion", "lorc/scorpion"),
    (r"shark", "lorc/shark-jaws"),
    (r"killer whale", "delapouite/sperm-whale"),
    (r"plesiosaurus", "lorc/sea-serpent"),
    (r"snake", "lorc/snake"),
    (r"triceratops", "delapouite/triceratops-head"),
    (r"tyrannosaurus", "lorc/dinosaur-rex"),
    (r"fire beetle", "lorc/scarab-beetle"),
    (r"stirge", "delapouite/amber-mosquito"),
    (r"axe beak|cockatrice", "delapouite/rooster"),
    (r"roc$", "lorc/eagle-emblem"),
    (r"purple worm|remorhaz", "lorc/worm-mouth"),
    (r"bulette|ankheg", "lorc/insect-jaws"),
    (r"kraken", "delapouite/kraken-tentacle"),
    (r"hydra", "lorc/hydra"),
    (r"tarrasque|behir", "delapouite/horned-reptile"),
    (r"medusa", "cathelineau/medusa-head"),
    (r"minotaur", "lorc/minotaur"),
    (r"harpy", "lorc/harpy"),
    (r"merfolk|merrow|sahuagin", "delapouite/mermaid"),
    (r"naga|couatl|lamia", "lorc/sea-serpent"),
    (r"sphinx", "delapouite/egyptian-sphinx"),
    (r"chimera|manticore", "lorc/lion"),
    (r"basilisk|gorgon", "delapouite/horned-reptile"),
    (r"gargoyle", "delapouite/gargoyle"),
    (r"centaur", "delapouite/centaur"),
    (r"satyr", "skoll/goat"),
    (r"dryad|sprite", "lorc/fairy"),
    (r"green hag|night hag|sea hag", "cathelineau/witch-face"),
    (r"treant|awakened tree", "cathelineau/tree-face"),
    (r"awakened shrub|shambling mound", "delapouite/vines"),
    (r"shrieker|violet fungus", "lorc/spotted-mushroom"),
    (r"golem", "delapouite/golem-head"),
    (r"iron golem", "delapouite/metal-golem-head"),
    (r"shield guardian", "lorc/robot-golem"),
    (r"animated armor", "delapouite/black-knight-helm"),
    (r"flying sword", "delapouite/ancient-sword"),
    (r"rug of smothering", "delapouite/red-carpet"),
    (r"mimic", "delapouite/mimic-chest"),
    (r"cloaker|darkmantle", "lucasms/cloak"),
    (r"gelatinous cube", "delapouite/cube"),
    (r"pudding|ooze|jelly", "delapouite/slime"),
    (r"gibbering mouther", "lorc/carnivore-mouth"),
    (r"aboleth|chuul|otyugh|roper|grick", "lorc/suckered-tentacle"),
    (r"rust monster", "delapouite/flying-beetle"),
    (r"invisible stalker", "delapouite/invisible-face"),
    (r"doppelganger", "delapouite/carnival-mask"),
    (r"djinni", "delapouite/djinn"),
    (r"efreeti", "lorc/ifrit"),
    (r"salamander|azer|magmin", "lorc/salamander"),
    (r"fire elemental", "carl-olsen/flame"),
    (r"water elemental", "lorc/big-wave"),
    (r"air elemental", "lorc/tornado"),
    (r"earth elemental|xorn", "delapouite/rock-golem"),
    (r"mephit", "lorc/imp-laugh"),
    (r"imp$|quasit|homunculus", "lorc/imp"),
    (r"deva|planetar|solar", "lorc/angel-wings"),
    (r"succubus", "sbed/evil-wings"),
    (r"devil|erinyes|lemure", "delapouite/devil-mask"),
    (r"balor|pit fiend|glabrezu|hezrou|marilith|nalfeshnee|vrock|dretch", "lorc/daemon-skull"),
    (r"rakshasa", "delapouite/tiger-head"),
    (r"oni|ogre", "delapouite/ogre"),
    (r"troll", "skoll/troll"),
    (r"ettin|hill giant|stone giant", "delapouite/giant"),
    (r"giant$", "delapouite/giant"),
    (r"hobgoblin", "caro-asercion/goblin"),
    (r"goblin", "delapouite/goblin-head"),
    (r"kobold", "lorc/lizardman"),
    (r"orc", "delapouite/orc-head"),
    (r"duergar|deep gnome", "delapouite/dwarf-face"),
    (r"drow", "delapouite/woman-elf-face"),
    (r"grimlock", "delapouite/brute"),
    (r"archmage|mage", "delapouite/wizard-face"),
    (r"priest|acolyte", "delapouite/sun-priest"),
    (r"druid", "lorc/fairy-wand"),
    (r"cult fanatic|cultist", "lorc/cultist"),
    (r"assassin", "darkzaitzev/hooded-assassin"),
    (r"spy", "delapouite/spy"),
    (r"scout", "delapouite/walking-scout"),
    (r"bandit|thug", "delapouite/bandit"),
    (r"berserker|tribal warrior", "delapouite/barbarian"),
    (r"knight|veteran|gladiator|guard", "delapouite/black-knight-helm"),
    (r"noble", "delapouite/jewel-crown"),
    (r"commoner", "lorc/hood"),
]
# Fallback per creature type
TYPES = {
    "Aberration": "lorc/suckered-tentacle",
    "Beast": "lorc/wolf-head",
    "Celestial": "lorc/angel-wings",
    "Construct": "delapouite/golem-head",
    "Dragon": "lorc/dragon-head",
    "Elemental": "lorc/tornado",
    "Fey": "lorc/fairy",
    "Fiend": "delapouite/devil-mask",
    "Giant": "delapouite/giant",
    "Humanoid": "lorc/hood",
    "Monstrosity": "lorc/claw-slashes",
    "Ooze": "delapouite/slime",
    "Plant": "delapouite/vines",
    "Undead": "lorc/broken-skull",
}


def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "CharacterForge"})).read().decode()


def icon_d(path):
    svg = fetch(RAW.format(path))
    ds = [d for d in re.findall(r'<path[^>]*\sd="([^"]+)"', svg) if d.strip() != "M0 0h512v512H0z"]
    if not ds:
        raise SystemExit(f"no path in {path}")
    return " ".join(ds)


def main():
    monsters = json.loads(fetch(SRD))["results"]
    mapping, by_type = {}, []
    for m in monsters:
        name = m["name"].lower()
        hit = next((p for rx, p in RULES if re.search(rx, name)), None)
        if not hit:
            hit = TYPES[m["type"]]
            by_type.append(m["name"])
        mapping[m["slug"]] = hit
    icons = {p: icon_d(p) for p in sorted(set(mapping.values()))}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"credit": "Icons by Lorc, Delapouite and others, game-icons.net (CC BY 3.0)", "map": mapping, "icons": icons}, f, separators=(",", ":"))
    print(f"{len(mapping)} monsters, {len(icons)} icons, {os.path.getsize(OUT) // 1024} KB")
    print("by type only:", ", ".join(by_type) or "none")


if __name__ == "__main__":
    main()
