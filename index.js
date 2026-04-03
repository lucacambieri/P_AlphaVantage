"use strict"

//#region Costanti e variabili globali

const ALPHA_URL = "https://www.alphavantage.co/query"
const LOCAL_URL = "http://localhost:3000"
const API_KEY = "2LBTUVT4Z5CZTOOE"

let address;
const mapStyle = myMapLibre.satelliteStyle;
const zoom = 10.3;

let chart;

let aziendeList;
let idAzienda;

//#endregion

//#region MAIN

chartType.selectedIndex = 0;

getAziende();

//#endregion


//#region EVENTI

// Per la ricerca incrementale
searchInput.addEventListener("keyup", function(){
	const searchText = this.value.toLowerCase();
	const searchResults = document.getElementById("searchResults");
	
	if (searchText.length >= 2) {
		ricercaIncrementale(searchText);
	} else {
		searchResults.classList.add("d-none");
		searchResults.innerHTML = "";
	}
});

// Per selezionare l'azienda dalla select
companySelect.addEventListener("change", function(){
	getGlobalQuotes(this.value);
	showChart(this.value);
	searchInput.value = "";
	bodyContainer.style.display = "";
	selectionMessage.classList = "d-none";
});

// Per selezionare il tipo di grafico
chartType.addEventListener("change", function(){
	if (searchInput.value != undefined) {
		showChart(searchInput.value)
	}
});

// Per selezionare il periodo del grafico
chartPeriod.addEventListener("change", function(){
	if (searchInput.value != undefined) {
		showChart(searchInput.value)
	}
	else {
		showChart(companySelect.value)
	}
});

// Per salvare il grafico come immagine su disco
btnSaveChart.addEventListener("click", function () {
    if (!chart) {
        alert("Nessun grafico da salvare.");
        return;
    }

    // Applica sfondo bianco (metodo già presente in myChart.js)
    myBarChart.setWhiteBackground(myChartCanvas);

    // Genera il nome file dal simbolo e dal periodo selezionato
    const symbol = searchInput.value || companySelect.value || "chart";
    const filename = `${symbol}_${chartPeriod.value}.png`;

    // Crea un link temporaneo e triggera il download
    const link = document.createElement("a");
    link.href = myChartCanvas.toDataURL("image/png");
    link.download = filename;
    link.click();
});

// Button per aggiornare "GLOBAL_QUOTE" facendo una chiamata direttamente ad ALphaVantage
btnUpdateData.addEventListener("click", async function(){
	let symbol = searchInput.value || companySelect.value;
	let httpResponse = await ajax.sendRequest("GET", ALPHA_URL, {
		"function": "GLOBAL_QUOTE",
		"apikey": API_KEY,	
		"symbol": symbol
		//"interval": "5min"
	})
	// function=&symbol=IBM&&apikey=demo
	let datas = httpResponse.data["Global Quote"];
	createBody(datas);
	let httpResponsePATCH = await ajax.sendRequest("PATCH", LOCAL_URL + "/GLOBAL_QUOTE/" + idAzienda, {"symbol": datas["01. symbol"], "name": datas["02. name"], "price": datas["05. price"], "open": datas["02. open"], "high": datas["03. high"], "low": datas["04. low"], "prevClose": datas["08. previous close"], "change": datas["09. change"], "changePct": datas["10. change percent"], "volume": datas["06. volume"]}).catch(ajax.errore);
	if (httpResponsePATCH) {
		console.log("Dati aggiornati con successo", httpResponsePATCH.data);
	}
	else {
		console.log("Errore durante l'aggiornamento dei dati", httpResponsePATCH.data);
	}
})

//#endregion

//#region FUNZIONI

	//#region RICERCA DELL'AZIENDA

	// Implementazione della ricerca incrementale
	function ricercaIncrementale(text){
		const searchResults = document.getElementById("searchResults");
		searchResults.innerHTML = "";
		
		const risultati = aziendeList.filter(azienda => 
			azienda.name.toLowerCase().includes(text) || 
			azienda.symbol.toLowerCase().includes(text)
		);
		
		if (risultati.length > 0) {
			risultati.slice(0, 10).forEach(azienda => {
				const li = document.createElement("li");
				li.className = "list-group-item";
				li.textContent = `${azienda.name} (${azienda.symbol})`;
				li.style.cursor = "pointer";
				
				li.addEventListener("click", function(){
					searchInput.value = azienda.symbol;
					searchResults.classList.add("d-none");
					getGlobalQuotes(azienda.symbol);
					companySelect.selectedIndex = -1;
					showChart(azienda.symbol);
					bodyContainer.style.display = "";
					selectionMessage.classList = "d-none";
				});
				
				searchResults.appendChild(li);
			});
			searchResults.classList.remove("d-none");
		} else {
			searchResults.classList.add("d-none");
		}
	}

	//#endregion

	//#region TABELLA

	function createHeaders(){
		const HEADERS = ["Symbol", "Last Trade", "Volume", "Open", "Day's High", 
		"Day's Low", "Previous Close", "Change", "% Change" ]
		const headersRow = document.querySelector(".header")
		headersRow.innerHTML = ""
		for (let header of HEADERS){
			const td = document.createElement("th")
			td.textContent = header;
			headersRow.appendChild(td)
		}
	}

	function createBody(quote){
		console.log(quote)

		tdSymbol.textContent = quote.symbol || quote["01. symbol"]; 
		tdPrice.textContent = quote.price || quote["05. price"];
		tdVolume.textContent = quote.volume || quote["06. volume"];
		tdOpen.textContent = quote.open || quote["02. open"];
		tdHigh.textContent = quote.high || quote["03. high"];
		tdLow.textContent = quote.low || quote["04. low"];
		tdPreviousClose.textContent = quote.prevClose || quote["08. previous close"];
		tdChange.textContent = quote.change || quote["09. change"];
		tdChangePercent.textContent = quote.changePct || quote["10. change percent"];
	}

	//#endregion

	//#region CHIAMATE

	// Inizializza la pagina
	async function getGlobalQuotes(farm) {
    let httpResponse = await ajax.sendRequest("GET", LOCAL_URL + "/GLOBAL_QUOTE", {"symbol": farm}).catch(ajax.errore)
    if (httpResponse) {
		let symbol = httpResponse["data"][0].symbol;
		idAzienda = httpResponse["data"][0].id;
		createHeaders();
		createBody(httpResponse["data"][0]);

		populateOverview(symbol);
		showMap(symbol);

		showChart(symbol);
	}
	}

	// Per ricevere la lista delle aziende da visualizzare nella select e per la ricerca incrementale
	async function getAziende(){
	let httpResponse = await ajax.sendRequest("GET", LOCAL_URL + "/GLOBAL_QUOTE");
	if (httpResponse) {
		aziendeList = httpResponse.data;
		console.log(aziendeList)
		for (const azienda of aziendeList) {
			let opt = document.createElement("option");
			opt.value = azienda["symbol"];
			opt.textContent = azienda.name;
			companySelect.appendChild(opt);
		}
		companySelect.selectedIndex = -1;
	}
	}

	// Per visualizzare la mappa
	async function showMap(symbol){
	let httpResponse = await ajax.sendRequest("GET", LOCAL_URL + "/OVERVIEW", {"symbol": symbol}).catch(ajax.errore);
	if (httpResponse.data[0]) {
		console.log(httpResponse.data[0]);
		address = httpResponse.data[0].address;

		const gpsAddress = await myMapLibre.geocode(address);
    
		if (gpsAddress) {
			await myMapLibre.drawMap(mapStyle, mapContainer, gpsAddress, zoom);
			//myMapLibre.addPOILayer(style);

            await myMapLibre.addMarker(gpsAddress, null, httpResponse.data[0].Name, `Ecco la sede di ${httpResponse.data[0].name}`);
		};
	}
	}

	// Per creare il grafico
	async function showChart(symbol){	
	myChartCanvas.innerHTML = "";

	const keys = [];
	const values = [];
	const colors = [];

	let chartDatas;
	let cnt = 0;
	let httpResponse = await ajax.sendRequest("GET", LOCAL_URL + "/TIME_SERIES_MONTHLY", {"symbol": symbol}).catch(ajax.errore);
	if (httpResponse.data) {
		chartDatas = httpResponse.data[0].data;
		console.log(chartDatas)
		let title;

		switch (chartPeriod.value) {
			case "6M":
				// Object.entries serve perchè chartDatas non è un vettore ma un oggetto
				Object.entries(chartDatas).forEach(([giorno, datas]) => {
					if (cnt < 6) {
						// Genera un rosso che si scurisce: da ff0000 a 800000
						const intensity = 255 - (cnt * 30); // Diminuisce di 30 per ogni iterazione
						const hexColor = Math.max(intensity, 0).toString(16).padStart(2, '0');
						const color = `#${hexColor}0000`;
						

						cnt++;
						console.log(giorno, datas);
						keys.push(giorno);
						values.push(datas["4. close"]);
						colors.push(color);

						title = "Andamento negli ultimi 6 mesi";
					}
					
				});
				break;
			case "1A":
				// Object.entries serve perchè chartDatas non è un vettore ma un oggetto
				Object.entries(chartDatas).forEach(([giorno, datas]) => {
					if (cnt < 12) {
						// Genera un rosso che si scurisce: da ff0000 a 800000
						const intensity = 255 - (cnt * 30); // Diminuisce di 30 per ogni iterazione
						const hexColor = Math.max(intensity, 0).toString(16).padStart(2, '0');
						const color = `#${hexColor}0000`;
						

						cnt++;
						console.log(giorno, datas);
						keys.push(giorno);
						values.push(datas["4. close"]);
						colors.push(color);

						title = "Andamento negli ultimi 12 mesi";
					}
					
				});
				break;
			case "2A":
				// Object.entries serve perchè chartDatas non è un vettore ma un oggetto
				Object.entries(chartDatas).forEach(([giorno, datas]) => {
					// Genera un rosso che si scurisce: da ff0000 a 800000
					const intensity = 255 - (cnt * 30); // Diminuisce di 30 per ogni iterazione
					const hexColor = Math.max(intensity, 0).toString(16).padStart(2, '0');
					const color = `#${hexColor}0000`;
					

					cnt++;
					console.log(giorno, datas);
					keys.push(giorno);
					values.push(datas["4. close"]);
					colors.push(color);					

					title = "Andamento negli ultimi 2 anni";
				});
				break;
			default:
				break;
		}
		keys.reverse();
		values.reverse();
		let type = chartType.value;

		myBarChart.setChartOptions(type, keys, values, colors, title); // type: bar / line
		if (!chart) {
			chart = new Chart(myChartCanvas, myBarChart.getChartOptions());
			console.log("Err");
		}
		else{
			chart.update();
		}
	}
	}

	// Per popolare la sezione "Overview"
	async function populateOverview(symbol){
	cardOv.innerHTML = `
		<h4 id="ovName" class="text-danger fw-bold">-</h4>
		<hr class="border-secondary">
		<p><strong><i class="bi bi-geo-alt text-danger"></i> Sede:</strong> <span id="ovAddress">-</span></p>
		<p><a href="" id="ovLink" class="text-danger text-decoration-none"><strong><i class="bi bi-globe text-danger"></i> Clicca qui per raggiungere il sito ufficiale</strong></a></p>
		<p><strong><i class="bi bi-info-circle text-danger"></i> </strong><span id="ovDescription">-</span></p>
	`;
	console.log(symbol)
	let quote;
	let httpResponse = await ajax.sendRequest("GET", LOCAL_URL + "/OVERVIEW", {"symbol": symbol}).catch(ajax.errore);
	if (httpResponse.data[0]) {
		quote = httpResponse.data[0];
		console.log(quote)
		ovName.textContent = quote.name
		ovAddress.textContent = quote.address
		ovLink.href = quote.website
		ovLink.target = "_blank"
		ovDescription.textContent = quote.description;
	} else {
		cardOv.innerHTML = `
			<strong><i class="bi bi-database-fill-exclamation text-danger"></i><span> Siamo spiacenti, dati non disponibili.</span></strong>
		`;
	}
	}

	//#endregion

//#endregion