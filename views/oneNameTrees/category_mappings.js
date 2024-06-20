// Mapping of category patterns to symbols and options
export const categoryMappings = [
    { pattern: /Unsourced/, symbol: "&#x1F526;" },
    { pattern: /Needs_.*_Record/, symbol: "&#x1F4C3;" },
    { pattern: /Needs_Biography/, symbol: "&#x270F;" },
    { pattern: /Needs_(Children|Parents|Spouse|Profiles)/, symbol: "&#128106;" },
    { pattern: /Uncertain Existence/, symbol: "&#x1F914;" }, // Thinking Face 🤔

    { pattern: /Notables/, symbol: "&#x2B50;", not: "Needs" },
    { pattern: /Family_Brick_Walls/, symbol: "&#x1F9F1;" }, // 🧱 Brick, representing the obstacles or challenges in genealogy

    { pattern: /(Adopted)|(Adopted Child)/, symbol: "<img src='views/oneNameTrees/images/adopted.png'>" }, // Adopted category
    { pattern: /Adoption/, symbol: "&#x1F465;" }, // 👥 Two people, representing adoption
    { pattern: /Cemetery|Burial|Memorial_Park|Memorial_Gardens/, symbol: "🕯️" }, // 🕯️ Candle (remembrance) for burial sites
    { pattern: /Died Young/, symbol: "👼" }, // 👼 Baby angel
    { pattern: /Stillbirth/, symbol: "🖤" }, // 🖤 Black heart

    {
        pattern: /(NSDAR_Patriot_Ancestors|NSSAR_Patriot_Ancestors|1776 Sticker|War|Military|Army)/,
        symbol: "&#x2694;&#xFE0F;",
    }, // ⚔️ Crossed Swords
    {
        pattern: /(US_Black_Heritage_Project)|(African-American Sticker)/,
        symbol: "<img src='views/oneNameTrees/images/USBH.png'>",
    }, // US Black Heritage Project
    { pattern: /Slave_Owners/, symbol: "⛓️" }, // Chains
    { pattern: /Freemasonry/, symbol: "📐" },
    { pattern: /Magna_Carta/, symbol: "👑" },
    { pattern: /Native American Sticker/, symbol: "<img src='views/oneNameTrees/images/Native_American.png'>" }, // Native American Project Sticker

    { pattern: /Immigrants|Emigrants/, symbol: "&#x1F6E9;" }, // 🛩️ Small Airplane, representing travel and movement across borders
    { pattern: /Centenarians/, symbol: "&#x1F382;" }, // 🎂 Birthday Cake, representing celebration of a significant milestone of age
    { pattern: /Appalachians/, symbol: "&#x26F0;&#xFE0F;" }, // ⛰️ Mountain

    { pattern: /Academics/, symbol: "&#x1F393;" }, // 🎓 Graduation Cap
    { pattern: /Accountants/, symbol: "&#x1F4B9;" }, // 💹 Chart Increasing with Yen, representing finance and accounting
    { pattern: /Architects/, symbol: "&#x1F3D8;" }, // 🏘️ European Castle, representing design and architecture
    { pattern: /Artists/, symbol: "&#x1F3A8;" }, // 🎨 Artist palette for artists
    { pattern: /Astronauts/, symbol: "&#x1F680;" }, // 🚀 Rocket
    { pattern: /Athletes/, symbol: "&#x1F3C3;" }, // 🏃 Person Running
    { pattern: /Authors|Writers/, symbol: "&#x1F4D6;" }, // 📚 Open book for authors and writers
    { pattern: /Barbers/, symbol: "&#x1F488;" }, // 💈 Barber Pole
    { pattern: /Bartenders/, symbol: "&#x1F37A;" }, // 🍺 Beer Mug
    { pattern: /Barristers|Lawyers/, symbol: "&#x2696;" }, // ⚖️ Scales of justice for legal professionals
    { pattern: /Baseball Players/, symbol: "&#x26BE;" }, // ⚾️ Baseball
    { pattern: /Blacksmiths/, symbol: "&#x1F528;" }, // 🔨 Hammer
    { pattern: /Broadcasters/, symbol: "&#x1F399;" }, // 🎙️ Studio Microphone
    { pattern: /Building_Trades/, symbol: "&#x1F3D7;" }, // 🏗️ Building Construction
    { pattern: /Business_Occupations/, symbol: "&#x1F4BC;" }, // 💼 Briefcase
    { pattern: /Carpenters/, symbol: "&#x1F6E0;" }, // 🛠️ Hammer and Wrench
    { pattern: /Civil_Engineers/, symbol: "&#x1F3D7;" }, // 🏗️ Building Construction, representing civil engineering
    { pattern: /Civil_Servants/, symbol: "&#x1F3DB;" }, // 🏛️ Classical Building
    { pattern: /Cobblers|Shoemakers|Bootmakers/, symbol: "&#x1F45E;" }, // 👞 Man’s Shoe
    { pattern: /Computer_Programmers|Computer_Scientists|Software_Engineers/, symbol: "&#x1F4BB;" }, // 💻 Laptop
    { pattern: /Cooks/, symbol: "&#x1F373;" }, // 🍳 Cooking
    { pattern: /Dentists/, symbol: "&#x1F9B7;" }, // 🦷 Tooth, representing dentistry
    { pattern: /Designers/, symbol: "&#x1F3A8;" }, // 🎨 Artist Palette
    { pattern: /Doctors/, symbol: "&#x2695;&#xFE0F;" }, // ⚕️ Medical Symbol, representing medical doctors
    { pattern: /Educators/, symbol: "&#x1F4DA;" }, // 📚 Books
    { pattern: /Engineers/, symbol: "&#x2699;" }, // ⚙️ Gear
    { pattern: /Entertainers|Actors/, symbol: "&#x1F3AD;" }, // 🎭 Performing Arts
    { pattern: /Explorers/, symbol: "&#x1F9ED;" }, // 🧭 Compass
    { pattern: /Factory_Workers/, symbol: "&#x1F3ED;" }, // 🏭 for factory work
    { pattern: /Farmers/, symbol: "&#x1F33E;" }, // 🌾 Sheaf of Rice
    { pattern: /Financial_Occupations/, symbol: "&#x1F4B9;" }, // 💹 Chart Increasing with Yen
    { pattern: /Firefighters/, symbol: "&#x1F692;" }, // 🚒 Fire Engine
    { pattern: /Forestry_Workers/, symbol: "&#x1F332;" }, // 🌲 Evergreen Tree
    { pattern: /Funeral_Directors|Undertakers|Morticians|Grave_diggers/, symbol: "&#x26B0;" }, // ⚰️ Coffin
    { pattern: /Gardeners/, symbol: "&#x1F33F;" }, // 🌿 Herb
    { pattern: /Genealogists/, symbol: "&#x1F4D6;" }, // 📖 Open Book
    { pattern: /Golfers/, symbol: "&#x1F3CC;" }, // 🏌️‍♂️ Golfer
    { pattern: /Inventors/, symbol: "&#x1F4A1;" }, // 💡 Light Bulb
    { pattern: /Journalists/, symbol: "&#x1F4F0;" }, // 📰 Newspaper for journalists
    { pattern: /Lawyers|Judges/, symbol: "&#x2696;" }, // ⚖️ Scales of Justice
    { pattern: /Librarians/, symbol: "&#x1F4D6;" }, // 📚 Books
    { pattern: /Leather_Workers/, symbol: "&#x1F45C;" }, // 👜 Represents leather goods
    { pattern: /Manufacturing_Occupations/, symbol: "&#x1F3ED;" }, // 🏭 Factory
    { pattern: /Mariners/, symbol: "&#x2693;" }, // ⚓ Anchor
    { pattern: /Mathematicians/, symbol: "&#x2797;" }, // ➗ Division Sign
    { pattern: /Mechanics/, symbol: "&#x1F527;" }, // 🔧 Wrench
    { pattern: /Merchants/, symbol: "&#x1F6CD;" }, // 🛍️ Shopping Bags
    { pattern: /Miners/, symbol: "&#x26CF;" }, // ⛏️ Pick
    { pattern: /Musicians|Music|Composers/, symbol: "&#x1F3B5;" }, // 🎵 Musical note for musicians
    { pattern: /Needle_Makers/, symbol: "&#x1FAA1;" }, // 🪡 Sewing needle, directly representing the occupation
    { pattern: /Nurses/, symbol: "&#x1F469;&#x200D;" }, // 👩⚕️ Woman Health Worker or 👨⚕️ Man Health Worker
    { pattern: /Oceanographers/, symbol: "&#x1F30A;" }, // 🌊 Water Wave
    { pattern: /Optometrists/, symbol: "&#x1F453;" }, // 👓 Glasses, representing optometry
    { pattern: /Packers/, symbol: "&#x1F4E6;" }, // 📦 Box, representing packing goods
    { pattern: /Painters/, symbol: "&#x1F3A8;" }, // 🖌️ Paintbrush
    { pattern: /Paramedics/, symbol: "&#x1F691;" }, // 🚑 Ambulance
    { pattern: /Pattern_Makers/, symbol: "&#x1F3F7;" }, // 🏷️ Tag, representing design or pattern making
    { pattern: /Pharmacists/, symbol: "&#x1F48A;" }, // 💊 Pill, representing pharmacists
    { pattern: /Photographers/, symbol: "&#x1F4F7;" }, // 📷 Camera
    { pattern: /Pilots|Aviators/, symbol: "&#x2708;" }, // ✈️ Airplane
    { pattern: /Plumbers/, symbol: "&#x1F4A7;" }, // 💧 Droplet
    { pattern: /Police/, symbol: "&#128110;" }, // 👮 Police officer
    { pattern: /Politicians/, symbol: "&#x1F5FA;" }, // 🏛️ Classical Building
    { pattern: /Professors/, symbol: "&#x1F393;" }, // 🎓 Graduation Cap
    { pattern: /Railroad_Workers/, symbol: "&#x1F682;" }, // 🚂 Locomotive
    { pattern: /Sailors/, symbol: "&#x2693;" }, // ⚓ Anchor
    { pattern: /Soap_Makers/, symbol: "&#x1F9FC;" }, // 🧼 Soap, directly representing the occupation
    { pattern: /Scientists|Biochemists/, symbol: "&#x1F52C;" }, // 🔬 Microscope for scientists
    { pattern: /Seamstresses/, symbol: "&#x1F9F5;" }, // 🧵 thread
    { pattern: /Tentmakers/, symbol: "&#x1F3D5;" }, // 🏕️ Tent, directly representing the occupation
    { pattern: /Twins/, symbol: "&#128111;" }, // 👯 People with bunny ears
    { pattern: /Umbrella_Makers/, symbol: "&#x2602;&#xFE0F;" }, // ☂️ Umbrella, directly representing the occupation
    { pattern: /Veterinarians/, symbol: "&#x1F436;" }, // 🐶 Puppy, directly representing veterinarians
    { pattern: /Wagonmakers/, symbol: "&#x1F69A;" }, // 🚚 Truck, used creatively for wagon making
    { pattern: /Writers/, symbol: "&#x1F4DD;" }, // ✍️ Writing Hand
];
