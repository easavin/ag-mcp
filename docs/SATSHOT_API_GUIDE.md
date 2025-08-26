# Satshot Core API Implementation Guide

## Overview
The Satshot Core API provides satellite imagery analysis, mapping, and geospatial processing capabilities. This guide outlines step-by-step implementation for each API method.

---

## 1. Authentication & Session Management

### 1.1 Login
```php
// Method: login(username, password, newsession)
$token = core_api::login("your_username", "your_password", false);
// Returns: Session token string
// Use token for subsequent API calls
```

### 1.2 Get Login Sessions
```php
// Method: get_my_login_sessions()
$sessions = core_api::get_my_login_sessions();
// Returns: Struct with session info (token, uid, IP, login time, last connect)
```

### 1.3 Logout
```php
// Method: logout()
$result = core_api::logout();
// Returns: Boolean (true if session destroyed)
```

---

## 2. Map Management

### 2.1 Get Available Maps
```php
// Method: get_available_maps(xcord, ycord, coordsys)
$maps = core_api::get_available_maps();
// Optional: Filter by point
$maps = core_api::get_available_maps(-95.0, 39.0, "+init=EPSG:4269");
// Returns: Struct with map names and extents
```

### 2.2 Load Map
```php
// Method: load_map(state_name)
$mapcontext = core_api::load_map("kansas"); // or any state/region
// Returns: Map context string for subsequent operations
```

### 2.3 Load Multiple Maps
```php
// Method: load_maps(state_list)
$contexts = core_api::load_maps(["kansas", "missouri", "nebraska"]);
// Returns: Struct keyed to state names with map contexts
```

### 2.4 Get Map Information
```php
// Method: get_map_info(mapcontext)
$info = core_api::get_map_info($mapcontext);
// Returns: Map details (name, width, height, projection, extents, etc.)
```

### 2.5 Set Map Extents
```php
// Method: set_map_extents(mapcontext, minx, miny, maxx, maxy, coordsys, buffer)
$extents = core_api::set_map_extents($mapcontext, -95.5, 38.5, -94.5, 39.5);
// Returns: New extents struct
```

### 2.6 Set Map Size
```php
// Method: set_map_size(mapcontext, width, height)
core_api::set_map_size($mapcontext, 800, 600);
// Returns: Boolean
```

### 2.7 Get Map Centroid
```php
// Method: get_map_centroid(mapcontext)
$centroid = core_api::get_map_centroid($mapcontext);
// Returns: Array with LAT and LONG fields
```

---

## 3. Layer Management

### 3.1 Get Map Layers
```php
// Method: get_map_layers(mapcontext, options)
$layers = core_api::get_map_layers($mapcontext);
// Optional: Include legend icons
$layers = core_api::get_map_layers($mapcontext, ["legendicon" => true, "legendwidth" => 30]);
// Returns: Array of layer structs with idx, name, type, status, etc.
```

### 3.2 Toggle Layer
```php
// Method: toggle_map_layer(mapcontext, layer)
$status = core_api::toggle_map_layer($mapcontext, "boundaries");
// Returns: Boolean (true if now on, false if off)
```

### 3.3 Toggle Multiple Layers
```php
// Method: toggle_multiple_map_layers(mapcontext, layers)
$statuses = core_api::toggle_multiple_map_layers($mapcontext, ["boundaries", "roads"]);
// Returns: Struct keyed to layer names with boolean status
```

### 3.4 Move Layer
```php
// Method: move_layer(mapcontext, layer, amount)
core_api::move_layer($mapcontext, "boundaries", 2); // Move up 2 positions
// Returns: Boolean
```

---

## 4. Scene Management

### 4.1 Get Available Scene Years
```php
// Method: get_available_scene_years()
$years = core_api::get_available_scene_years();
// Returns: Array of years in reverse chronological order
// Requires: "viewscenes" privilege
```

### 4.2 Get Available Scenes
```php
// Method: get_available_scenes(mapcontext, year, month)
$scenes = core_api::get_available_scenes($mapcontext);
// Optional filters:
$scenes = core_api::get_available_scenes($mapcontext, 2024, 6); // June 2024
// Returns: Struct of scene descriptions keyed to scene index
```

### 4.3 Get Scenes for Extent
```php
// Method: get_available_scenes_for_extent(extents, coordsys, year, month)
$extents = ["minx" => -95.5, "miny" => 38.5, "maxx" => -94.5, "maxy" => 39.5];
$scenes = core_api::get_available_scenes_for_extent($extents);
// Returns: Scene descriptions within specified extent
```

### 4.4 Get Scenes for Date Range
```php
// Method: get_available_scenes_for_extent_and_date_range(extents, startdate, enddate, coordsys, scenetypes)
$scenes = core_api::get_available_scenes_for_extent_and_date_range(
    $extents, "2024-01-01", "2024-12-31", "+init=EPSG:4269", ["Landsat", "RapidEye"]
);
// Returns: Scenes within extent and date range
```

### 4.5 Get Scene Information
```php
// Method: get_scene_info(sceneid)
$info = core_api::get_scene_info(12345);
// Returns: Scene details (name, date, type, satellite, bands, projection, etc.)
```

### 4.6 Display Scene
```php
// Method: display_scene(mapcontext, sceneid)
$result = core_api::display_scene($mapcontext, 12345);
// Returns: Boolean (true if layer created)
```

### 4.7 Get Displayed Scene
```php
// Method: get_displayed_scene(mapcontext)
$sceneid = core_api::get_displayed_scene($mapcontext);
// Returns: Scene ID or false if none displayed
```

### 4.8 Clear Displayed Scene
```php
// Method: clear_displayed_scene(mapcontext)
$result = core_api::clear_displayed_scene($mapcontext);
// Returns: Boolean
```

---

## 5. Hilite (Selection) Management

### 5.1 Get Hilites
```php
// Method: get_hilites(wkt)
$hilites = core_api::get_hilites(true); // Include WKT geometry
// Returns: Struct keyed to hilite IDs with shape attributes
```

### 5.2 Clear All Hilites
```php
// Method: clear_hilites()
core_api::clear_hilites();
// Returns: Boolean
```

### 5.3 Select by Point
```php
// Method: select_by_point(mapcontext, xcord, ycord, layername, coordsys, toggle, tolerance)
$hilites = core_api::select_by_point($mapcontext, -95.0, 39.0, "boundaries");
// Returns: Hilite info struct
```

### 5.4 Select by Pixel Point
```php
// Method: select_by_pixel_point(mapcontext, xpoint, ypoint, layername, toggle, pixeltolerance)
$hilites = core_api::select_by_pixel_point($mapcontext, 400, 300, "boundaries");
// Returns: Hilite info struct
```

### 5.5 Select by Extents
```php
// Method: select_by_extents(mapcontext, layername, toggle)
$hilites = core_api::select_by_extents($mapcontext, "boundaries", false);
// Returns: Hilite info struct
```

### 5.6 Remove Hilited Shape
```php
// Method: remove_hilited_shape(hiliteid)
core_api::remove_hilited_shape(123);
// Returns: Boolean
```

### 5.7 Rename Hilited Shape
```php
// Method: rename_hilited_shape(gid, newname)
core_api::rename_hilited_shape(123, "Field A");
// Returns: Boolean
```

---

## 6. Image Extraction & Analysis

### 6.1 Extract Image Around Hilited Shape
```php
// Method: extract_image_around_hilited_shape(mapcontext, sceneid, hiliteid, buffer)
$imagehandle = core_api::extract_image_around_hilited_shape($mapcontext, 12345, 123, 100);
// Returns: Image handle string for extracted image
// Requires: "analyze" privilege
```

### 6.2 Extract Image Set
```php
// Method: extract_image_set_around_hilited_shapes(mapcontext, sceneid, hilitelist, buffer)
$images = core_api::extract_image_set_around_hilited_shapes($mapcontext, 12345, [123, 124, 125]);
// Returns: Struct keyed to hilite IDs with image handles
```

### 6.3 Georeference Extracted Image
```php
// Method: georeference_extracted_image(imagehandle, eastingchange, northingchange)
core_api::georeference_extracted_image($imagehandle, 10, -5); // Shift 10m east, 5m south
// Returns: Boolean
```

---

## 7. Multiband Analysis

### 7.1 Create Multibands from Extracted Images
```php
// Method: create_multibands_from_extracted_image_set(hiliteimages, options)
$multibands = core_api::create_multibands_from_extracted_image_set($extracted_images);
// Returns: Struct keyed to hilite IDs with multiband image handles
// Requires: "analyze" privilege
```

### 7.2 Classify Multiband Analyses
```php
// Method: classify_multiband_analyses(mbclassopts)
$classification_options = [
    $multiband_handle => [
        "NIR" => [[
            "mode" => "standard",
            "numzones" => 5,
            "colortable" => 1
        ]],
        "NDVIR" => [[
            "mode" => "minmax",
            "numzones" => 8,
            "colors" => [[255,0,0], [0,255,0], [0,0,255], [255,255,0], [255,0,255], [0,255,255], [128,128,128], [255,128,0]]
        ]]
    ]
];
$classified = core_api::classify_multiband_analyses($classification_options);
// Returns: Struct with classified analysis handles
// Requires: "analyze" privilege
```

---

## 8. Image Display

### 8.1 Create Image Display Layer
```php
// Method: create_image_display_layer(mapcontext, imagehandle, title, hilite)
$layerid = core_api::create_image_display_layer($mapcontext, $imagehandle, "Analysis Result");
// Returns: Layer ID
```

### 8.2 Create Multiple Display Layers
```php
// Method: create_multiple_image_display_layers(mapcontext, imglist, titles, hilites)
$layers = core_api::create_multiple_image_display_layers(
    $mapcontext, 
    [$handle1, $handle2], 
    [$handle1 => "Field 1", $handle2 => "Field 2"]
);
// Returns: Struct keyed to image handles with layer IDs
```

### 8.3 Remove Image Display Layer
```php
// Method: remove_image_display_layer(mapcontext, imagehandle)
core_api::remove_image_display_layer($mapcontext, $imagehandle);
// Returns: Boolean
```

---

## 9. Image Information & Analysis

### 9.1 Get Image Information
```php
// Method: get_image_info(imagehandle, hiliteid)
$info = core_api::get_image_info($imagehandle);
// Returns: Image details struct
```

### 9.2 Get Analysis Information
```php
// Method: get_analysis_info(imagehandle, options)
$analysis = core_api::get_analysis_info($imagehandle);
// Returns: Analysis details with zone statistics
```

### 9.3 Get Raster Information
```php
// Method: get_rasters_info(imagehandles)
$rasters = core_api::get_rasters_info([$handle1, $handle2]);
// Returns: Detailed raster information for multiple images
```

---

## 10. Image Processing & Editing

### 10.1 Change Image Zone Color
```php
// Method: change_image_zone_color(imagehandle, colorzones)
$color_zones = [
    1 => ["red" => 255, "green" => 0, "blue" => 0],
    2 => ["red" => 0, "green" => 255, "blue" => 0]
];
$new_handle = core_api::change_image_zone_color($imagehandle, $color_zones);
// Returns: New image handle
// Requires: "precisionag" privilege
```

### 10.2 Merge Analysis Zones
```php
// Method: merge_analysis_zones(mapcontext, hiliteid, imagehandle, mergezones)
$new_handle = core_api::merge_analysis_zones($mapcontext, $hiliteid, $imagehandle, [1, 2, 3]);
// Returns: New image handle with merged zones
// Requires: "precisionag" privilege
```

### 10.3 Shift Analysis Zone Endpoints
```php
// Method: shift_analysis_zone_endpoints(mapcontext, hiliteid, imagehandle, shiftzone, shiftamount)
$new_handle = core_api::shift_analysis_zone_endpoints($mapcontext, $hiliteid, $imagehandle, 2, 5);
// Returns: New image handle with shifted zone boundaries
// Requires: "precisionag" privilege
```

### 10.4 Dissolve Image Regions
```php
// Method: dissolve_image_regions(imagehandle, minpixels)
$new_handle = core_api::dissolve_image_regions($imagehandle, 100);
// Returns: New image handle with small regions dissolved
// Requires: "precisionag" privilege
```

### 10.5 Paint Image Polygons (Map Coordinates)
```php
// Method: paint_image_polygons_with_map_coordinates(mapcontext, imagehandle, zonenumber, polylist, coordsys)
$polygons = [[[[-95.1, 39.1], [-95.0, 39.1], [-95.0, 39.0], [-95.1, 39.0], [-95.1, 39.1]]]];
$new_handle = core_api::paint_image_polygons_with_map_coordinates(
    $mapcontext, $imagehandle, 1, $polygons
);
// Returns: New edited image handle
// Requires: "precisionag" privilege
```

---

## 11. Image Export

### 11.1 Export in Simple Format
```php
// Method: export_image_in_simple_format(imagehandle, name, format, coordsys, url, struct, emailopts)
$export = core_api::export_image_in_simple_format($imagehandle, "analysis_result", "GeoTIFF");
// Returns: Base64 encoded file or URL
// Requires: "export_processed" privilege for multiband
```

### 11.2 Export in Processed Format
```php
// Method: export_image_in_processed_format(imagehandle, name, format, process, coordsys, options)
$options = [
    "type" => "Byte",
    "compression" => "LZW",
    "bands" => [1, 2, 3]
];
$export = core_api::export_image_in_processed_format(
    $raw_imagehandle, "processed_image", "GeoTIFF", "RESCALE", "+init=EPSG:4269", $options
);
// Returns: Processed image export
// Requires: "export_processed" and potentially "export_processed_rescale" privileges
```

---

## 12. Map Drawing & Visualization

### 12.1 Draw Map
```php
// Method: draw_map(mapcontext, format, options)
$options = [
    "transparent" => false,
    "size" => [1024, 768],
    "layers" => [1, 2, 3] // Optional: specific layers only
];
$map_image = core_api::draw_map($mapcontext, "PNG24", $options);
// Returns: Base64 encoded image
```

### 12.2 Draw Map for Multiple Display Layers
```php
// Method: draw_map_for_multiple_display_layers(mapcontext, layerlist, reproject, format, options)
$maps = core_api::draw_map_for_multiple_display_layers(
    $mapcontext, ["layer1", "layer2"], false, "PNG24"
);
// Returns: Struct keyed to layer names with map images
```

---

## 13. Geometry Operations

### 13.1 Create Hilite Objects from WKT
```php
// Method: create_hilite_objects_from_wkt(objects, coordsys, hiliteids)
$wkt_objects = [
    "field1" => "POLYGON((-95.1 39.1, -95.0 39.1, -95.0 39.0, -95.1 39.0, -95.1 39.1))"
];
$hilites = core_api::create_hilite_objects_from_wkt($wkt_objects);
// Returns: Hilite info struct
// Requires: "create_geoobjects" privilege
```

### 13.2 Upload Objects to Hilites
```php
// Method: upload_objects_to_hilites(vecfile, namecolumn, format, coordsys)
$shapefile = base64_encode(file_get_contents("boundaries.zip"));
$hilites = core_api::upload_objects_to_hilites($shapefile, "NAME", "shapefile");
// Returns: Hilite info struct
// Requires: "create_geoobjects" privilege
```

### 13.3 Geometric Union of Hilited Shapes
```php
// Method: make_geometric_union_of_hilited_shapes(name, shplist)
$new_hiliteid = core_api::make_geometric_union_of_hilited_shapes("Combined Field", [123, 124]);
// Returns: New hilite ID
// Requires: "create_geoobjects" privilege
```

---

## 14. Query Operations

### 14.1 Query Layer at Map Coordinate
```php
// Method: query_map_layer_at_map_coordinate(mapcontext, xcord, ycord, layer, coordsys, tolerance)
$results = core_api::query_map_layer_at_map_coordinate($mapcontext, -95.0, 39.0, "boundaries");
// Returns: Struct with shape attributes or false
```

### 14.2 Query Layer at Pixel Point
```php
// Method: query_map_layer_at_pixel_point(mapcontext, xpoint, ypoint, layer, pixeltolerance)
$results = core_api::query_map_layer_at_pixel_point($mapcontext, 400, 300, "boundaries");
// Returns: Struct with shape attributes or false
```

---

## 15. Zoom & Navigation

### 15.1 Zoom at Map Coordinate
```php
// Method: zoom_map_at_map_coordinate(mapcontext, xcord, ycord, zoomfactor, coordsys)
$new_extents = core_api::zoom_map_at_map_coordinate($mapcontext, -95.0, 39.0, 2.0);
// Returns: New extents struct
```

### 15.2 Zoom at Pixel Point
```php
// Method: zoom_map_at_pixel_point(mapcontext, xpoint, ypoint, zoomfactor)
$new_extents = core_api::zoom_map_at_pixel_point($mapcontext, 400, 300, 2.0);
// Returns: New extents struct
```

### 15.3 Zoom to Coordinate with Radius
```php
// Method: zoom_map_to_map_coordinate_with_radius(mapcontext, xcord, ycord, radius, coordsys)
$new_extents = core_api::zoom_map_to_map_coordinate_with_radius($mapcontext, -95.0, 39.0, 1000);
// Returns: New extents struct (1000m radius buffer)
```

---

## 16. Color Tables & Styling

### 16.1 Get Available Color Tables
```php
// Method: get_available_colortables()
$colortables = core_api::get_available_colortables();
// Returns: Struct with colortable info (name, method, maxzones, colors)
```

---

## 17. PLS (Public Land Survey) Operations

### 17.1 Search PLS Locations
```php
// Method: search_pls_locations(layer, criteria)
$criteria = [
    "state" => "Kansas",
    "county" => "Johnson",
    "town" => 12,
    "twndir" => "S",
    "range" => 25,
    "rngdir" => "E"
];
$results = core_api::search_pls_locations("township", $criteria);
// Returns: Array of PLS location results
```

---

## 18. Photo Management

### 18.1 Upload Geotagged Photo
```php
// Method: upload_geotagged_photo(description, imagefile, options)
$photo_data = base64_encode(file_get_contents("field_photo.jpg"));
$options = [
    "object" => ["type" => "boundaries", "id" => 123],
    "comments" => "Crop condition assessment"
];
$photo_id = core_api::upload_geotagged_photo("Field inspection", $photo_data, $options);
// Returns: Photo ID
// Requires: "geotagged_photos" privilege
```

### 18.2 Download Saved Photo
```php
// Method: download_saved_geotagged_photo(photoid, thumbnail)
$photo_data = core_api::download_saved_geotagged_photo(456, 128); // 128px thumbnail
// Returns: Base64 encoded image or false
```

---

## 19. Soilmap Operations

### 19.1 Create Soilmap Vectors
```php
// Method: create_soilmap_vectors_for_boundaries(hilitelist)
$soilmaps = core_api::create_soilmap_vectors_for_boundaries([123, 124]);
// Returns: Struct keyed to hilite IDs with vector handles
// Requires: "create_soilmap" privilege
```

---

## Implementation Notes

### Error Handling
```php
try {
    $result = core_api::some_method($params);
} catch (Exception $e) {
    // Handle API errors
    error_log("Satshot API Error: " . $e->getMessage());
}
```

### Required Privileges
Many methods require specific privileges:
- `viewscenes`: Scene viewing operations
- `analyze`: Image analysis operations  
- `precisionag`: Advanced analysis and editing
- `export_processed`: Image export operations
- `create_geoobjects`: Geometry creation operations
- `geotagged_photos`: Photo upload operations
- `create_soilmap`: Soilmap generation

### Data Structures

**Extents Struct:**
```php
$extents = [
    "minx" => -95.5,
    "miny" => 38.5, 
    "maxx" => -94.5,
    "maxy" => 39.5
];
```

**RGB Color Struct:**
```php
$color = [
    "red" => 255,
    "green" => 0,
    "blue" => 0
];
```

### Best Practices

1. Always call `login()` first to establish a session
2. Use `load_map()` early to establish map context
3. Check return values for error conditions
4. Handle temporary file cleanup appropriately
5. Use appropriate coordinate systems for your data
6. Buffer extents appropriately for analysis operations
7. Verify required privileges before calling restricted methods

### Typical Workflow

1. **Login** → `login()`
2. **Load Map** → `load_map()`
3. **Set Extents** → `set_map_extents()`
4. **Find Scenes** → `get_available_scenes()`
5. **Select Objects** → `select_by_point()` or `select_by_extents()`
6. **Extract Images** → `extract_image_around_hilited_shape()`
7. **Analyze** → `create_multibands_from_extracted_image_set()` + `classify_multiband_analyses()`
8. **Display** → `create_image_display_layer()`
9. **Export** → `export_image_in_simple_format()`
10. **Logout** → `logout()`

This guide provides comprehensive coverage of the Satshot Core API methods. Each method includes parameter descriptions, return values, and privilege requirements as documented in the API specification.