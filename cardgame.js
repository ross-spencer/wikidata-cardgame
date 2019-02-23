const NUM_PROPERTIES = 5;

// 1772-01-01T00:00:00Z
function formatDate(date, precision) {
    if (precision >= 11) {
        return date.substring(0, 10);
    } else if (precision == 10) {
        return date.substring(0, 7);
    } else if (precision == 9) {
        return date.substring(0, 4);
    } else if (precision == 8) {
        return date.substring(0, 3)+"0s";
    } else if (precision == 7) {
        return (parseInt(date.substring(0, 2))+1)+"th century";
    } else {
        return "a long time ago";
    }
}

function buildDeck(data) {
    // Step 1: Get good property candidates.
    let propertiesCount = {};
    for (let line of data.results.bindings) {
        if (line.property.value in propertiesCount) {
            propertiesCount[line.property.value].count += 1;
        } else {
            propertiesCount[line.property.value] = {count: 1, id: line.property.value, label: line.propLabel.value};
        }
    }

    let propertiesSorted = [];

    for (const property in propertiesCount) {
        propertiesSorted.push([property, propertiesCount[property].count, propertiesCount[property].label]);
    }

    propertiesSorted = propertiesSorted.sort((a,b) => b[1] - a[1]);
    //propertiesSorted = propertiesSorted.sort((a,b) => Math.random());


    propertiesSorted = propertiesSorted.slice(0, NUM_PROPERTIES);
    //console.log(propertiesSorted);

    // Step 2: Get items which have all these properties.
    let items = {};

    for (let line of data.results.bindings) {
        let valid = false;
        for (let property of propertiesSorted) {
            if (property[0] == line.property.value) {
                valid = true;
            }
        }

        if (valid) {
            let value = ""

            if (line.precision) {
                value = formatDate(line.valueLabel.value, line.precision.value);
            } else {
                value = line.valueLabel.value;
                if (line.unitLabel && line.unitLabel.value != "1") {
                    value += " "+line.unitLabel.value;
                }
            }
            if (line.item.value in items) {
            } else {
                items[line.item.value] = {item: line.item.value, label: line.itemLabel.value, description: line.itemDescription.value, properties: {}};
                if (line.image) {
                    items[line.item.value].image = line.image.value;
                }
            }
            items[line.item.value].properties[line.propLabel.value] = {property: line.propLabel.value, value: value};
        }
    }

    //console.log(items);

    let it = [];
    for (let item in items) {
        let i = items[item];
        i.known_properties = Object.keys(i.properties).length;
        for (let property of propertiesSorted) {
            //console.log(i);
            if (property[2] in i.properties) {
            } else {
                i.properties[property[2]] = {property: property[2], value: "-"};
            }
        }
        it.push(i);
    }
    it.sort((a,b) => a.valid_count - b.valid_count);

    it.sort((a,b) => b.known_properties - a.known_properties);
    it = it.slice(0, 32);

    return it;
}

const query = `
SELECT ?item ?itemLabel ?itemDescription ?image ?property ?propLabel ?valueLabel ?unitLabel ?precision WHERE {
  ?item wdt:P31/wdt:P279* wd:Q11344.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en,de". }
  OPTIONAL { ?item wdt:P18 ?image. }
  ?item ?p ?statement.
  ?statement a wikibase:BestRank.

  ?property rdfs:label ?propLabel.
  ?property wikibase:claim ?p.
  ?property rdf:type wikibase:Property .

  FILTER (lang(?propLabel) = 'en' ).

  {
    ?property wikibase:propertyType wikibase:Quantity.

    ?statement ?psn ?valueNode.    
    ?valueNode wikibase:quantityAmount ?value.
    ?valueNode wikibase:quantityUnit ?unit.

    ?property wikibase:statementValue ?psn.
  } UNION {
    ?property wikibase:propertyType wikibase:Time.

    ?statement ?psn ?valueNode.
    ?valueNode wikibase:timeValue ?value.
    ?valueNode wikibase:timePrecision ?precision.

    ?property wikibase:statementValue ?psn.
  }
}
        `;
const url = `https://query.wikidata.org/bigdata/namespace/wdq/sparql?format=json&query=${query}`;
window.fetch(url).then(
    function (response) {
        if (response.status !== 200) {
            console.warn(`Looks like there was a problem. Status Code: ${response.status}`);
            return;
        }
        response.json().then(function (data) {
            var deck = buildDeck(data);


            for (let card of deck) {
                genCard(card);
                /*
                console.log(" ");
                console.log(card.label);
                for (let property in card.properties) {
                    console.log(card.properties[property].property+": "+card.properties[property].value);
                }
                */
            }

        });
    }
).catch(function (err) {
    console.warn('Fetch Error :-S', err);
});