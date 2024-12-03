// Charger les données CSV et GeoJSON
d3.csv("population.csv").then(function(data) {
    var populationData = {};
    data.forEach(function(d) {
        populationData[normalizeName(d.Nom_Commun)] = {
            marocains: +d.Marocains,
            etrangers: +d.Etrangers,
            population: +d.Population,
            menages: +d.Menages
        };
    });

    d3.json("communes.geojson").then(function(geojsonData) {
        var map = L.map('map');

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        var geoJsonLayer = L.geoJSON(geojsonData, {
            style: function(feature) {
                var nomCommune = normalizeName(feature.properties.Nom_Commun);
                var population = populationData[nomCommune] ? populationData[nomCommune].population : 0;
                var color = getColor(population);
                return { color: "#000000", weight: 0.5, fillColor: color, fillOpacity: 0.7 };
            },
            onEachFeature: function(feature, layer) {
                var nomCommune = normalizeName(feature.properties.Nom_Commun);
                var population = populationData[nomCommune] ? populationData[nomCommune].population : "Inconnu";
                var marocains = populationData[nomCommune] ? populationData[nomCommune].marocains : "Inconnu";
                var etrangers = populationData[nomCommune] ? populationData[nomCommune].etrangers : "Inconnu";
                var menages = populationData[nomCommune] ? populationData[nomCommune].menages : "Inconnu";

                layer.bindPopup("<strong>" + feature.properties.Nom_Commun + "</strong><br>" +
                    "Population: " + population + "<br>" +
                    "Marocains: " + marocains + "<br>" +
                    "Étrangers: " + etrangers + "<br>" +
                    "Ménages: " + menages);

                // Ajouter un diagramme pour chaque commune
                layer.on('click', function() {
                    updateChart(nomCommune, populationData[nomCommune]);
                });
            }
        }).addTo(map);

        var bounds = geoJsonLayer.getBounds();
        map.fitBounds(bounds);

        addLegend(map);

        // Afficher le diagramme de la première commune
        if (Object.keys(populationData).length > 0) {
            updateChart(Object.keys(populationData)[0], populationData[Object.keys(populationData)[0]]);
        }
    });
});

// Normalisation des noms
function normalizeName(name) {
    return name ? name.trim().toLowerCase() : '';
}

// Obtenir une couleur selon la population
function getColor(population) {
    return population > 30000 ? '#800026' :
           population > 10000  ? '#BD0026' :
           population > 7000  ? '#E31A1C' :
           population > 5000  ? '#FC4E2A' :
           population > 4000   ? '#FD8D3C' :
           population > 3000   ? '#FEB24C' :
           population > 0     ? '#FED976' :
                                '#FFEDA0';
}

// Ajouter la légende
function addLegend(map) {
    var legend = L.control({ position: "bottomleft" });

    legend.onAdd = function(map) {
        var div = L.DomUtil.create('div', 'legend');
        var grades = [0, 3000, 4000, 5000, 7000, 10000, 30000];
        var labels = [];

        div.innerHTML += '<div class="legend-title">Nombre de population</div>';

        for (var i = 0; i < grades.length; i++) {
            div.innerHTML +=
                '<div><div class="color-box" style="background-color:' + getColor(grades[i] + 1) + '"></div>' +
                '<span class="label">' + (grades[i] === 0 ? "0" : grades[i]) + ' - ' + (grades[i + 1] ? grades[i + 1] : "plus") + '</span></div>';
        }

        return div;
    };

    legend.addTo(map);
}

// Diagramme circulaire avec ECharts
function updateChart(nomCommune, data) {
    var chartDom = document.getElementById('chart');
    var myChart = echarts.init(chartDom);

    var option = {
        title: {
            text: 'Détails de la population',
            subtext: nomCommune,
            left: 'center'
        },
        tooltip: {
            trigger: 'item'
        },
        legend: {
            orient: 'vertical',
            left: 'left'
        },
        series: [
            {
                name: 'Population',
                type: 'pie',
                radius: '50%',
                data: [
                    { value: data.marocains, name: 'Marocains' },
                    { value: data.etrangers, name: 'Étrangers' },
                    { value: data.menages, name: 'Ménages' }
                ],
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }
        ]
    };

    myChart.setOption(option);
}















// Charger le GeoJSON des bâtiments endommagés
d3.json("damagedbuilding.geojson").then(function(damageData) {
    // Préparer les données agrégées par commune
    var buildingData = {};

    damageData.features.forEach(function(feature) {
        var commune = normalizeName(feature.properties.nom_commune);
        var etat = feature.properties.etat;
        
        // Stocker les bâtiments endommagés par commune
        if (etat === "damage") {
            if (!buildingData[commune]) {
                buildingData[commune] = { damage: 0 };
            }
            buildingData[commune].damage++;
        }
    });

    // Charger les communes GeoJSON
    d3.json("communes.geojson").then(function(geojsonData) {
        // Créer une nouvelle carte
        var map2 = L.map('map2').setView([31.0, -8.5], 9); // Ajustez la vue initiale de la carte

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map2);

        // Ajouter les polygones des communes sur la carte
        L.geoJSON(geojsonData, {
            style: function() {
                return { color: "#800026", weight: 2, fillOpacity: 0.1 };
            }
        }).addTo(map2);

        geojsonData.features.forEach(function(feature) {
            var commune = normalizeName(feature.properties.Nom_Commun);
            var damageCount = buildingData[commune] ? buildingData[commune].damage : 0;

            // Calculer le centre de la commune à partir des coordonnées du périmètre
            var latlngs;
            if (feature.geometry.type === "Polygon") {
                latlngs = feature.geometry.coordinates[0].map(function(coord) {
                    return [coord[1], coord[0]]; // Inverser la longitude et la latitude
                });
            } else if (feature.geometry.type === "MultiPolygon") {
                // Calculer le centre d'un multipolygone en combinant toutes les coordonnées
                latlngs = feature.geometry.coordinates[0][0].map(function(coord) {
                    return [coord[1], coord[0]]; // Inverser la longitude et la latitude
                });
            }

            // Utiliser Leaflet pour obtenir le centre géographique du polygone
            var polygon = L.polygon(latlngs);
            var centerLatLng = polygon.getBounds().getCenter();

            // Ajouter un cercle proportionnel
            if (damageCount > 0) {
                var radius = Math.sqrt(damageCount) * 100; // Ajuster le facteur multiplicatif pour la taille du cercle
                L.circle(centerLatLng, {
                    color: "red",
                    fillColor: "red",
                    fillOpacity: 1,
                    radius: radius
                }).addTo(map2).bindPopup("<strong>" + feature.properties.Nom_Commun + "</strong><br>" +
                    "Bâtiments endommagés : " + damageCount);
            }
        });


        addLegendForBuildings(map2);
    });
});

// Ajouter une légende pour les bâtiments
function addLegendForBuildings(map) {
    var legend = L.control({ position: "bottomleft" });

    legend.onAdd = function(map) {
        var div = L.DomUtil.create('div', 'legend');
        
        div.innerHTML += '<div><span class="circle" style="background-color: red;"></span> Nombre des bâtiments endommagés</div>';
        return div;
    };

    legend.addTo(map);
}

// Fonction pour normaliser le nom de la commune (si nécessaire)
function normalizeName(name) {
    return name ? name.trim().toLowerCase() : "";
}