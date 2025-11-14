#!/usr/bin/env tsx

// @ts-nocheck
/**
 * Satshot Parameter Optimizer - TypeScript Version
 * 
 * This script systematically tests different parameter combinations for Satshot API
 * to find working configurations and saves successful PNG files for manual inspection.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

// Import our Satshot tools
import { SatshotAuth } from '../src/mcp-servers/satshot/auth';

interface TestBoundary {
  name: string;
  coordinates: [number, number][];
  bounds: {
    minx: number;
    miny: number;
    maxx: number;
    maxy: number;
  };
}

interface TestResult {
  method: string;
  success: boolean;
  wktFormat?: string;
  parameterIndex?: number;
  extractIndex?: number;
  parameters?: any[];
  result?: any;
  error?: any;
  imageHandle?: string;
  mapSize?: number;
  filename?: string;
  filepath?: string;
}

class SatshotParameterOptimizer {
  private auth: SatshotAuth;
  private client: any;
  private results: TestResult[] = [];
  private outputDir: string;
  private testBoundary: TestBoundary;

  constructor() {
    this.auth = new SatshotAuth();
    this.client = null;
    
    // Get current directory 
    const currentDir = __dirname;
    this.outputDir = path.join(currentDir, '../satshot-optimization-results');
    
    // Test field boundary (NDfield from John Deere)
    this.testBoundary = {
      name: 'NDfield',
      coordinates: [
        [-99.16857557318038, 47.69464840127363],
        [-99.15788965246504, 47.69464840127363], 
        [-99.15788965246504, 47.70175375708481],
        [-99.16857557318038, 47.70175375708481],
        [-99.16857557318038, 47.69464840127363]
      ],
      bounds: {
        minx: -99.16857557318038,
        miny: 47.69464840127363, 
        maxx: -99.15788965246504,
        maxy: 47.70175375708481
      }
    };
  }

  async initialize(): Promise<void> {
    console.log('🚀 Starting Satshot Parameter Optimization');
    
    // Create output directory
    await fs.mkdir(this.outputDir, { recursive: true });
    
    // Authenticate with Satshot
    console.log('🔐 Authenticating with Satshot...');
    const hasAuth = await this.auth.authenticate();
    if (!hasAuth) {
      throw new Error('Failed to authenticate with Satshot');
    }
    
    this.client = this.auth.getClient();
    if (!this.client) {
      throw new Error('No Satshot client available after authentication');
    }
    
    console.log('✅ Authentication successful');
  }

  /**
   * Test different WKT boundary formats and coordinate systems
   */
  async testBoundaryFormats(): Promise<void> {
    console.log('\n📍 Testing Boundary Formats...');
    
    const wktVariations = [
      {
        name: 'Standard_WGS84',
        wkt: this.generateWKT(this.testBoundary.coordinates, false),
        srs: '+init=EPSG:4326'
      },
      {
        name: 'Standard_NAD83', 
        wkt: this.generateWKT(this.testBoundary.coordinates, false),
        srs: '+init=EPSG:4269'
      },
      {
        name: 'Closed_WGS84',
        wkt: this.generateWKT(this.testBoundary.coordinates, true), 
        srs: '+init=EPSG:4326'
      },
      {
        name: 'Closed_NAD83',
        wkt: this.generateWKT(this.testBoundary.coordinates, true),
        srs: '+init=EPSG:4269'
      }
    ];

    const parameterVariations = [
      // Basic object format
      (wkt: string, srs: string) => [{ 'NDfield': wkt }, srs],
      // String key format
      (wkt: string, srs: string) => [{ NDfield: wkt }, srs], 
      // Array format
      (wkt: string, srs: string) => [[wkt], srs],
      // Direct WKT
      (wkt: string, srs: string) => [wkt, srs],
      // With map context (we'll get this from load_map)
      (wkt: string, srs: string, mapContext?: string) => [{ 'NDfield': wkt }, srs, mapContext],
      // Single parameter
      (wkt: string) => [{ 'NDfield': wkt }]
    ];

    // First, load a map to get map context
    console.log('🗺️ Loading map for North Dakota...');
    const mapResponse = await this.client.callMethod('load_map', ['ND']);
    const mapContext = mapResponse.error ? null : mapResponse.result;
    
    if (mapContext) {
      console.log(`✅ Map loaded: ${mapContext}`);
      
      // Set extents for the field area
      await this.client.callMethod('set_map_extents', [
        this.testBoundary.bounds.minx,
        this.testBoundary.bounds.miny,
        this.testBoundary.bounds.maxx, 
        this.testBoundary.bounds.maxy
      ]);
    }

    for (const wktVar of wktVariations) {
      console.log(`\n  Testing: ${wktVar.name}`);
      
      for (let i = 0; i < parameterVariations.length; i++) {
        const paramGen = parameterVariations[i];
        
        try {
          let params: any[];
          if (i === 4 && mapContext) {
            // Include map context
            params = paramGen(wktVar.wkt, wktVar.srs, mapContext);
          } else if (i === 5) {
            // Single parameter version
            params = paramGen(wktVar.wkt, wktVar.srs || 'EPSG:4326');
          } else {
            params = paramGen(wktVar.wkt, wktVar.srs);
          }
          
          console.log(`    Variation ${i + 1}: ${JSON.stringify(params).substring(0, 100)}...`);
          
          const response = await this.client.callMethod('create_hilite_objects_from_wkt', params);
          
          if (!response.error && response.result) {
            console.log(`    ✅ SUCCESS: ${JSON.stringify(response.result)}`);
            
            this.results.push({
              method: 'create_hilite_objects_from_wkt',
              success: true,
              wktFormat: wktVar.name,
              parameterIndex: i + 1,
              parameters: params,
              result: response.result
            });
            
            // If successful, try to continue with image extraction
            await this.testImageExtraction(response.result, mapContext, wktVar.name, i + 1);
            
          } else {
            console.log(`    ❌ FAILED: ${response.error?.faultString || 'Unknown error'}`);
            
            this.results.push({
              method: 'create_hilite_objects_from_wkt',
              success: false,
              wktFormat: wktVar.name,
              parameterIndex: i + 1,
              parameters: params,
              error: response.error
            });
          }
          
        } catch (error) {
          console.log(`    💥 EXCEPTION: ${(error as Error).message}`);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  /**
   * Test image extraction if hilite creation was successful
   */
  async testImageExtraction(hiliteResult: any, mapContext: string | null, wktFormat: string, paramIndex: number): Promise<void> {
    console.log(`      🖼️ Testing image extraction...`);
    
    const hiliteIds = Object.keys(hiliteResult);
    if (hiliteIds.length === 0) return;
    
    const hiliteId = hiliteIds[0];
    
    // First, try to get scenes
    const sceneTests = await this.testSceneRetrieval();
    
    for (const sceneResult of sceneTests) {
      if (!sceneResult.success) continue;
      
      const scene = sceneResult.result;
      console.log(`        Testing with scene: ${scene}`);
      
      // Test different extract_image parameters
      const extractVariations = [
        [mapContext, scene, parseInt(hiliteId), 100],
        [mapContext, scene, hiliteId, 100],
        [scene, parseInt(hiliteId), 100],
        [scene, hiliteId, 100],
        [mapContext, scene, parseInt(hiliteId)],
        [scene, parseInt(hiliteId)]
      ];
      
      for (let i = 0; i < extractVariations.length; i++) {
        try {
          const params = extractVariations[i];
          console.log(`          Extract variation ${i + 1}: ${JSON.stringify(params)}`);
          
          const extractResponse = await this.client.callMethod('extract_image_around_hilited_shape', params);
          
          if (!extractResponse.error && extractResponse.result) {
            console.log(`          ✅ Image extracted: ${extractResponse.result}`);
            
            // Try to draw the map
            await this.testMapDrawing(wktFormat, paramIndex, i + 1, extractResponse.result);
            
            this.results.push({
              method: 'extract_image_around_hilited_shape',
              success: true,
              wktFormat,
              parameterIndex: paramIndex,
              extractIndex: i + 1,
              parameters: params,
              result: extractResponse.result
            });
            
          } else {
            console.log(`          ❌ Extract failed: ${extractResponse.error?.faultString || 'Unknown'}`);
          }
          
        } catch (error) {
          console.log(`          💥 Extract exception: ${(error as Error).message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }

  /**
   * Test scene retrieval with different parameters
   */
  async testSceneRetrieval(): Promise<Array<{ success: boolean; paramIndex: number; parameters: any[]; result?: string }>> {
    console.log(`      🛰️ Testing scene retrieval...`);
    
    const sceneResults: Array<{ success: boolean; paramIndex: number; parameters: any[]; result?: string }> = [];
    const bounds = this.testBoundary.bounds;
    
    const sceneVariations = [
      // Basic extent search
      [bounds, '+init=EPSG:4326'],
      [bounds, '+init=EPSG:4269'],
      [[bounds.minx, bounds.miny, bounds.maxx, bounds.maxy], '+init=EPSG:4326'],
      [[bounds.minx, bounds.miny, bounds.maxx, bounds.maxy], '+init=EPSG:4269'],
      
      // With year parameters
      [bounds, '+init=EPSG:4269', 2024],
      [bounds, '+init=EPSG:4269', 2023],
      [bounds, '+init=EPSG:4269', 2022],
      [bounds, '+init=EPSG:4269', 2021],
      [bounds, '+init=EPSG:4269', 2020],
      [bounds, '+init=EPSG:4269', 2019],
      
      // Just bounds
      [bounds],
      [[bounds.minx, bounds.miny, bounds.maxx, bounds.maxy]]
    ];
    
    for (let i = 0; i < sceneVariations.length; i++) {
      try {
        const params = sceneVariations[i];
        console.log(`        Scene variation ${i + 1}: ${JSON.stringify(params)}`);
        
        const response = await this.client.callMethod('get_available_scenes_for_extent', params);
        
        if (!response.error && response.result) {
          console.log(`        ✅ Scenes found: ${response.result}`);
          sceneResults.push({
            success: true,
            paramIndex: i + 1,
            parameters: params,
            result: response.result
          });
        } else {
          console.log(`        ❌ No scenes: ${response.error?.faultString || 'Unknown'}`);
        }
        
      } catch (error) {
        console.log(`        💥 Scene exception: ${(error as Error).message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return sceneResults;
  }

  /**
   * Test map drawing and save PNG if successful
   */
  async testMapDrawing(wktFormat: string, paramIndex: number, extractIndex: number, imageHandle: string): Promise<string | null> {
    console.log(`            🎨 Testing map drawing...`);
    
    try {
      const mapResponse = await this.client.callMethod('draw_map', []);
      
      if (!mapResponse.error && mapResponse.result) {
        const mapBase64 = mapResponse.result;
        console.log(`            ✅ Map drawn! Size: ${mapBase64.length} bytes`);
        
        // Save the PNG file
        const filename = `map_${wktFormat}_param${paramIndex}_extract${extractIndex}_${Date.now()}.png`;
        const filepath = path.join(this.outputDir, filename);
        
        // Convert base64 to buffer and save
        const buffer = Buffer.from(mapBase64, 'base64');
        await fs.writeFile(filepath, buffer);
        
        console.log(`            💾 Saved: ${filename}`);
        
        this.results.push({
          method: 'draw_map',
          success: true,
          wktFormat,
          parameterIndex: paramIndex,
          extractIndex,
          imageHandle,
          mapSize: mapBase64.length,
          filename,
          filepath
        });
        
        return filepath;
        
      } else {
        console.log(`            ❌ Map drawing failed: ${mapResponse.error?.faultString || 'Unknown'}`);
      }
      
    } catch (error) {
      console.log(`            💥 Map drawing exception: ${(error as Error).message}`);
    }
    
    return null;
  }

  /**
   * Generate WKT polygon from coordinates
   */
  private generateWKT(coordinates: [number, number][], ensureClosed = true): string {
    let coords = [...coordinates];
    
    // Ensure polygon is closed
    if (ensureClosed) {
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coords.push([...first]);
      }
    }
    
    const coordPairs = coords.map(coord => `${coord[0]} ${coord[1]}`).join(', ');
    return `POLYGON((${coordPairs}))`;
  }

  /**
   * Save detailed results to JSON file
   */
  async saveResults(): Promise<void> {
    const resultsFile = path.join(this.outputDir, `optimization_results_${Date.now()}.json`);
    
    const summary = {
      timestamp: new Date().toISOString(),
      testField: this.testBoundary.name,
      totalTests: this.results.length,
      successfulTests: this.results.filter(r => r.success).length,
      savedMaps: this.results.filter(r => r.method === 'draw_map' && r.success).length,
      results: this.results
    };
    
    await fs.writeFile(resultsFile, JSON.stringify(summary, null, 2));
    
    console.log(`\n📊 Results saved to: ${resultsFile}`);
    console.log(`🎯 Successful boundary creations: ${this.results.filter(r => r.method === 'create_hilite_objects_from_wkt' && r.success).length}`);
    console.log(`🖼️ Successful image extractions: ${this.results.filter(r => r.method === 'extract_image_around_hilited_shape' && r.success).length}`);
    console.log(`🗺️ Successful map drawings: ${this.results.filter(r => r.method === 'draw_map' && r.success).length}`);
    
    const savedMaps = this.results.filter(r => r.method === 'draw_map' && r.success);
    if (savedMaps.length > 0) {
      console.log('\n🎉 Saved PNG files:');
      savedMaps.forEach(map => {
        console.log(`  📁 ${map.filename} (${((map.mapSize || 0) / 1024).toFixed(1)}KB)`);
      });
    }
  }

  /**
   * Run the complete optimization process
   */
  async run(): Promise<void> {
    try {
      await this.initialize();
      await this.testBoundaryFormats();
      await this.saveResults();
      
      console.log('\n✅ Optimization complete!');
      console.log(`📂 Check results in: ${this.outputDir}`);
      
    } catch (error) {
      console.error('❌ Optimization failed:', error);
      throw error;
    }
  }
}

// Run the optimizer if called directly
const optimizer = new SatshotParameterOptimizer();
optimizer.run().catch(console.error);

export { SatshotParameterOptimizer };


