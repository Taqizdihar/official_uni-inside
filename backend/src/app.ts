import { randomUUID } from 'node:crypto';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pino from 'pino';
import type { Pool } from 'mysql2/promise';
import type { Config } from './config/env';
import { schemaCheck, migrationStatus } from './database/migrations';
import { HttpError, asyncRoute, errorHandler } from './utils/http';
import { authRoutes } from './routes/auth';
import { publicContentRoutes, adminContentRoutes } from './routes/content';
import { mediaRoutes } from './routes/media';
import { analyticsRoutes } from './routes/analytics';
import { socialMediaRoutes } from './routes/socialMedia';
import {footerRoutes} from './routes/footer';
import {secondaryPageRoutes} from './routes/secondaryPages';
import {aboutTeamRoutes} from './routes/aboutTeam';

export function originAllowed(origin: string | undefined, config: Config) { return !!origin && config.origins.includes(origin); }
export function createApp(config: Config, db: Pool) {
  const app=express(); app.disable('x-powered-by');
  const logger=pino({redact:['req.headers.cookie','req.headers.authorization','password','token','secret','*.password','*.token'],level:config.LOG_LEVEL});
  if (config.TRUST_PROXY) app.set('trust proxy',1);
  app.use(helmet()); app.use(compression()); app.use(cookieParser());
  app.use((req,res,next) => {
    const started=Date.now();
    req.requestId=/^[a-zA-Z0-9-]{8,100}$/.test(req.get('x-request-id')??'')?req.get('x-request-id')!:randomUUID();
    req.log=logger.child({requestId:req.requestId}); res.set('X-Request-Id',req.requestId);
    res.on('finish',()=>req.log?.info({method:req.method,path:req.path,status:res.statusCode,durationMs:Date.now()-started},'request complete'));
    next();
  });
  app.use(((req,res,next) => {
    const origin=req.get('origin');
    if (origin && !originAllowed(origin,config)) return next(new HttpError(403,'ORIGIN_DENIED','This origin is not allowed.'));
    if (origin) {
      res.set('Access-Control-Allow-Origin',origin);
      res.set('Access-Control-Allow-Credentials','true');
      res.vary('Origin');
      res.set('Access-Control-Allow-Headers','Content-Type,X-CSRF-Token,X-Request-Id');
      res.set('Access-Control-Allow-Methods','GET,POST,PATCH,PUT,DELETE,OPTIONS');
    }
    if (req.method==='OPTIONS') return res.status(204).end();
    if (!['GET','HEAD'].includes(req.method) && !origin && req.get('sec-fetch-site')) return next(new HttpError(403,'ORIGIN_REQUIRED','This browser request needs an Origin header.'));
    next();
  }) as RequestHandler);
  app.use(rateLimit({windowMs:config.API_RATE_LIMIT_WINDOW_MINUTES*60_000,limit:config.API_RATE_LIMIT_MAX,standardHeaders:'draft-8',legacyHeaders:false}));
  app.use(express.json({limit:'64kb',strict:true}));
  app.get(`${config.API_BASE_PATH}/health`,(_req,res)=>res.set('Cache-Control','no-store').json({data:{status:'ok'}}));
  app.get(`${config.API_BASE_PATH}/ready`,asyncRoute(async (_req,res)=>{
    res.set('Cache-Control','no-store');
    try {
      await db.query('SELECT 1');
      const status=await migrationStatus(db);
      if (config.REQUIRE_LATEST_MIGRATION && status.some(item=>!item.applied || item.applied.checksum!==item.checksum)) throw new Error('Migration not ready');
      const schema=await schemaCheck(db);
      if (!schema.ready) throw new Error('Schema not ready');
      res.json({data:{status:'ready'}});
    } catch { res.status(503).json({error:{code:'NOT_READY',message:'Dependencies are not ready.',details:[],requestId:_req.requestId}}); }
  }));
  app.use(config.API_BASE_PATH,authRoutes(config,db));
  app.use(config.API_BASE_PATH,secondaryPageRoutes(config,db));
  app.use(config.API_BASE_PATH,aboutTeamRoutes(config,db));
  app.use(config.API_BASE_PATH,mediaRoutes(config,db));
  app.use(config.API_BASE_PATH,analyticsRoutes(config,db));
  app.use(config.API_BASE_PATH,socialMediaRoutes(config,db));
  app.use(config.API_BASE_PATH,footerRoutes(config,db));
  app.use(config.API_BASE_PATH,publicContentRoutes(db,config));
  app.use(config.API_BASE_PATH,adminContentRoutes(config,db));
  app.use((_req,_res,next)=>next(new HttpError(404,'NOT_FOUND','Route not found.')));
  app.use(errorHandler);
  return app;
}
