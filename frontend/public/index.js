document.querySelector('.logo').addEventListener('click', (e) => {
    window.location.href = 'index.html';
});

function checkHash() {
    switch (window.location.hash) {
        case '#wrong':
            if (window.location.pathname == '/') {
                document.querySelector('#wrong_password').style.display = "block";
            }
            return;
        case '#block':
            document.querySelector('main').innerHTML = null;
            let header = document.createElement('h1')
            header.innerText = 'Melde dich bitte an!';
            document.querySelector('main').appendChild(header)
            return;
    }
}