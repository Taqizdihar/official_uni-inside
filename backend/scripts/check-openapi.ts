import SwaggerParser from '@apidevtools/swagger-parser';
async function main(){const api=await SwaggerParser.validate('docs/openapi.yaml');console.info(`OpenAPI validated: ${Object.keys(api.paths??{}).length} documented paths.`);}
main().catch(err=>{console.error(err instanceof Error?err.message:'OpenAPI validation failed');process.exitCode=1;});
