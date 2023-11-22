import { Handler } from 'aws-lambda';

export type VpcLatticeHandler = Handler<VpcLatticeEvent, VpcLatticeResult>;

export type VpcLatticeEvent = VpcLatticeEventV1 | VpcLatticeEventV2;

// @see https://docs.aws.amazon.com/vpc-lattice/latest/ug/lambda-functions.html#receive-event-from-service
export interface VpcLatticeEventV1 {
  body: string | null
  headers: VpcLatticeEventHeaders
  is_base64_encoded: boolean
  method: string
  query_string_parameters: VpcLatticeQueryStringParameters | null
  raw_path: string
}

export interface VpcLatticeEventV2 {
  version: string
  path: string
  method: string
  queryStringParameters: VpcLatticeQueryStringParametersV2 | null
  headers: VpcLatticeEventHeaders
  body: string | null
  isBase64Encoded: boolean
  requestContext: {
    serviceNetworkArn: string
    serviceArn: string
    targetGroupArn: string
    region: string
    timeEpoch: string
    // identity
  }
}

export interface VpcLatticeResult {
  statusCode: number
  statusDescription?: string
  headers?: {
    [header: string]: boolean | number | string
  }
  body: string
  isBase64Encoded?: boolean | undefined
}

export interface VpcLatticeEventHeaders {
  [name: string]: string | undefined
}

export interface VpcLatticeQueryStringParameters {
  [name: string]: string | undefined
}

export interface VpcLatticeQueryStringParametersV2 {
  [name: string]: string[] | undefined
}
