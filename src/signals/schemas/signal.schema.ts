import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SignalDocument = Signal & Document;

@Schema({ timestamps: true })
export class Signal {
  @Prop({ required: true, index: true })
  deviceId: string;

  @Prop({ required: true, type: Date, index: true })
  time: Date;

  @Prop({ required: true })
  dataLength: number;

  @Prop({ required: true })
  dataVolume: number;

  @Prop({ required: true })
  avgSpeed: number;

  @Prop({ type: Object, required: true })
  minCoordinates: {
    x: number;
    y: number;
  };

  @Prop({ type: Object, required: true })
  maxCoordinates: {
    x: number;
    y: number;
  };

  @Prop({ type: Object })
  rawData: any;
}

export const SignalSchema = SchemaFactory.createForClass(Signal);

SignalSchema.index({ deviceId: 1, time: -1 });
SignalSchema.index({ time: -1 });
SignalSchema.index({ deviceId: 1, createdAt: -1 });
