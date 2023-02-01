function fetchWahlen() {
    fetch('/wahlen', {
        method: 'GET'
    }).then((response) => {
        response.json().then(wahlen => {
            wahlen.forEach(wahl => {
                let  opt = document.createElement('option')
                opt.value = wahl.name
                opt.text = wahl.name
                document.querySelector('#erstwahlListe').appendChild(opt)
                let  opt2 = document.createElement('option')
                opt2.value = wahl.name
                opt2.text = wahl.name
                document.querySelector('#zweitwahlListe').appendChild(opt2)
                let desc = document.createElement('section')
                desc.classList.add('descript')
                let title = document.createElement('h2')
                title.innerText = wahl.name
                desc.appendChild(title)
                let des = document.createElement('p')
                des.innerText = wahl.desc
                desc.appendChild(des)
                document.querySelector('.descriptions').appendChild(desc)
            });
        })
    })
}