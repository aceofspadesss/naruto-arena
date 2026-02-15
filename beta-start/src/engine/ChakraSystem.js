class ChakraSystem {
    static generateRandomChakra(amount) {
        const types = ['tai', 'blo', 'nin', 'gen'];
        const chakra = { tai: 0, blo: 0, nin: 0, gen: 0, rnd: 0 };
        for (let i = 0; i < amount; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            chakra[type]++;
        }
        // Update RND
        chakra.rnd = chakra.tai + chakra.blo + chakra.nin + chakra.gen;
        return chakra;
    }

    static addChakra(pool, gain) {
        pool.tai += gain.tai;
        pool.blo += gain.blo;
        pool.nin += gain.nin;
        pool.gen += gain.gen;
        pool.rnd = pool.tai + pool.blo + pool.nin + pool.gen;
    }
}

module.exports = ChakraSystem;
