onload = () => {
    console.log(nomangle('Your constant is'), PI);

    if (DEBUG) {
        console.log(nomangle('Debug mode enabled'))
    }

    new Game();
};
