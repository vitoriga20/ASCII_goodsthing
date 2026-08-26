struct AsciiUniforms {
	density: f32,
	glyphScale: f32,
	brightness: f32,
	contrast: f32,
	threshold: f32,
	invert: f32,
	edgeStrength: f32,
	colourMode: f32,
	charCount: f32,
	_pad0: f32,
	_pad1: f32,
	_pad2: f32,
}

@group(0) @binding(0) var<uniform> u: AsciiUniforms;
@group(0) @binding(1) var src: texture_2d<f32>;
@group(0) @binding(2) var dst: texture_storage_2d<rgba16float, write>;
// Glyph atlas: one row of `charCount` square cells. textureSample is fragment-
// stage-only, so the atlas must be read with textureLoad (integer texel
// coords). The cell side is the ASCII_ATLAS_CELL constant in ascii-pass.ts.
@group(0) @binding(3) var atlas: texture_2d<f32>;

const atlasCell: u32 = 32u;

fn luminance(colour: vec3f) -> f32 {
	return dot(colour, vec3f(0.2126, 0.7152, 0.0722));
}

fn outputColour(source: vec3f, mask: f32) -> vec3f {
	if (u.colourMode < 0.5) { return source * mask; }
	if (u.colourMode < 1.5) { return vec3f(0.18, 0.95, 0.62) * mask; }
	if (u.colourMode < 2.5) { return vec3f(1.0, 0.72, 0.27) * mask; }
	return vec3f(mask);
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3u) {
	let dimensions = textureDimensions(src);
	if (gid.x >= dimensions.x || gid.y >= dimensions.y) { return; }

	let aspect = f32(dimensions.x) / f32(dimensions.y);
	let cellCountX = max(1.0, u.density * aspect);
	let cellSize = vec2f(f32(dimensions.x) / cellCountX, f32(dimensions.y) / u.density);
	let cell = floor(vec2f(gid.xy) / cellSize);
	let centre = vec2u(min(vec2f(dimensions - vec2u(1u)), (cell + vec2f(0.5)) * cellSize));
	let centreColour = textureLoad(src, centre, 0);
	let right = textureLoad(src, vec2u(min(centre.x + 1u, dimensions.x - 1u), centre.y), 0);
	let down = textureLoad(src, vec2u(centre.x, min(centre.y + 1u, dimensions.y - 1u)), 0);
	var value = clamp((luminance(centreColour.rgb) + u.brightness) * u.contrast, 0.0, 1.0);
	let edge = abs(luminance(right.rgb) - luminance(centreColour.rgb)) + abs(luminance(down.rgb) - luminance(centreColour.rgb));
	value = clamp(value + edge * u.edgeStrength, 0.0, 1.0);
	if (u.invert > 0.5) { value = 1.0 - value; }
	value = select(value, step(u.threshold, value), u.threshold > 0.0);
	let local = fract(vec2f(gid.xy) / cellSize);
	let scaled = clamp((local - vec2f(0.5)) / u.glyphScale + vec2f(0.5), vec2f(0.0), vec2f(1.0));
	let levelCount = max(1.0, floor(u.charCount));
	let index = min(levelCount - 1.0, floor(value * levelCount));
	let glyphX = min(atlasCell - 1u, u32(floor(scaled.x * f32(atlasCell))));
	let glyphY = min(atlasCell - 1u, u32(floor(scaled.y * f32(atlasCell))));
	let mask = clamp(textureLoad(atlas, vec2u(u32(index) * atlasCell + glyphX, glyphY), 0).r, 0.0, 1.0);
	textureStore(dst, gid.xy, vec4f(outputColour(centreColour.rgb, mask), centreColour.a));
}