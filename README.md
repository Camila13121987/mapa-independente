# Mapa dos Espaços Independentes de Lisboa (Map of Independent Spaces in Lisbon)

## About the Project

The **Mapa dos Espaços Independentes de Lisboa** is a mapping project dedicated to increasing the visibility and promoting the independent art and cultural spaces in Lisbon, Portugal.

### Project Genesis

This initiative was born from the academic research of Camila Grimaldi during her master's dissertation, "Alternative models of cultural and artistic communication: the case of CHÃO em São Luís do Maranhão, Brazil" for the University of Lisbon. A key finding of her study was the challenge in accessing a consolidated database of Lisbon's independent art spaces, which sparked the idea for this map.

### Research and Systematization

The initial data collection involved:
*   Gathering information from various cultural agendas, existing cultural maps, and relevant publications.
*   Engaging in informal conversations with individuals knowledgeable about Lisbon's active independent spaces.

An initial database of approximately 70 art spaces was compiled. From this, spaces were selected that showed a correlation with the Chão SLZ space in Brazil, based on criteria such as:
*   Non-commercial representation of artists.
*   Transdisciplinary nature.
*   Self-identification as an independent space.

### Construction and Publication

This project, including the interactive map, aims to:
*   Publish the research findings and the curated database of independent spaces.
*   Foster a discussion around the identity and role of Independent Spaces in Lisbon.
*   Serve as an evolving platform where cultural managers, artists, curators, and other agents can contribute by registering spaces they manage or are aware of.
*   Facilitate networking among these spaces and stakeholders.
*   Provide valuable data to public administrators and policymakers to inform and support cultural public policies in the country.

## Interactive Map

This repository contains the source code for an interactive map that visualizes these independent spaces. Key features include:
*   Displaying geolocated points from a GeoJSON dataset (`data/map-dev_db_espaços-independentes.geojson`).
*   A time slider to filter spaces based on their active years.
*   A timelapse feature to observe the emergence of spaces over the years.
*   Popups with detailed information for each space, including a Google Maps preview.
*   Responsive design for accessibility on desktop, tablet, and mobile devices.
*   The map is viewable at `src/map/index.html`.

## Data

The primary data for the map is stored in `data/map-dev_db_espaços-independentes.geojson`.
This GeoJSON file is generated from `data/map-dev_db_espaços-independentes.csv` using the script `src/geospatial/csv-to-geojson.py`.

## How to Contribute

We encourage the community to help us build and maintain a comprehensive database of Independent Art Spaces in Lisbon. If you know of or manage an independent space that is not yet on the map, please get in touch or look for ways to submit information through the [official website](https://www.mapaindependente.com/).

Your contributions are vital for:
*   Keeping the map accurate and up-to-date.
*   Strengthening the network of independent cultural initiatives.
*   Supporting the ongoing research and its potential impact on cultural policy.

---

*This README is based on information available at [mapaindependente.com](https://www.mapaindependente.com/)*
