struct AsciiUniforms {
	density: f32,
	glyphScale: f32,
	brightness: f32,
	contrast: f32,
	threshold: f32,
	invert: f32,
	edgeStrength: f32,
	colourMode: f32,
}

@group(0) @binding(0) var<uniform> u: AsciiUniforms;
@group(0) @binding(1) var src: texture_2d<f32>;
@group(0) @binding(2) var dst: texture_storage_2d<rgba16float, write>;

fn luminance(colour: vec3f) -> f32 {
	return dot(colour, vec3f(0.2126, 0.7152, 0.0722));
}

fn glyphRow(glyph: u32, row: u32) -> u32 {
	switch (glyph) {
		case 1u: { let rows = array<u32, 7>(0u, 0u, 0u, 0u, 0u, 0x04u, 0u); return rows[row]; }
		case 2u: { let rows = array<u32, 7>(0u, 0u, 0x04u, 0u, 0u, 0x04u, 0u); return rows[row]; }
		case 3u: { let rows = array<u32, 7>(0u, 0x15u, 0x0eu, 0x1fu, 0x0eu, 0x15u, 0u); return rows[row]; }
		case 4u: { let rows = array<u32, 7>(0u, 0u, 0x04u, 0x1fu, 0x04u, 0u, 0u); return rows[row]; }
		case 5u: { let rows = array<u32, 7>(0x0au, 0x1fu, 0x0au, 0x1fu, 0x0au, 0u, 0u); return rows[row]; }
		case 6u: { let rows = array<u32, 7>(0x19u, 0x1au, 0x04u, 0x08u, 0x16u, 0x13u, 0u); return rows[row]; }
		case 7u: { let rows = array<u32, 7>(0x0eu, 0x11u, 0x17u, 0x15u, 0x17u, 0x10u, 0x0eu); return rows[row]; }
		default: { return 0u; }
	}
}

fn glyphMask(scaled: vec2f, glyph: u32) -> f32 {
	let pixel = min(vec2u(floor(scaled * vec2f(5.0, 7.0))), vec2u(4u, 6u));
	let row = glyphRow(glyph, pixel.y);
	let bit = 4u - pixel.x;
	return select(0.0, 1.0, (row & (1u << bit)) != 0u);
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
	let mask = glyphMask(scaled, min(7u, u32(floor(value * 8.0))));
	textureStore(dst, gid.xy, vec4f(outputColour(centreColour.rgb, mask), centreColour.a));
}
