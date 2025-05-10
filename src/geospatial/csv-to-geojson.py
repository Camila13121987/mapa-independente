# %% Python script to read a CSV file, process it and export to GeoJSON format

import geopandas as gpd

# Read CSV file
gdf = gpd.read_file(filename="data/map-dev_db_espaços-independentes.csv")

# Add geometry
gdf["geometry"] = gpd.points_from_xy(gdf.point_lon, gdf.point_lat)

# Convert to GeoDataFrame
gdf = gpd.GeoDataFrame(gdf, geometry="geometry", crs="EPSG:4326")

# %% Export to GeoJSON
gdf.to_file(
    filename="data/map-dev_db_espaços-independentes.geojson",
    driver="GeoJSON",
    layer="mapa-indpendente",
)

# %%
