onload = () => {
    console.log(nomangle('Your constant is'), PI);
    console.log(nomangle('Some calculation:'), evaluate(PI * 2));

    if (DEBUG) {
        console.log(nomangle('Debug mode enabled'))
    }

    new Game();
};
