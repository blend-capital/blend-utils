import { i128, u64 } from '@blend-capital/blend-sdk';
import { Address, Contract, contract } from '@stellar/stellar-sdk';

/**
 * PriceData type
 */
export interface PriceData {
  price: i128;
  timestamp: u64;
}

/**
 * Asset type
 */
export type Asset =
  | { tag: 'Stellar'; values: readonly [Address] }
  | { tag: 'Other'; values: readonly [string] };

export class OracleAggregatorContract extends Contract {
  spec: contract.Spec;

  constructor(address: string) {
    super(address);
    this.spec = new contract.Spec([
      "AAAAAAAAAAAAAAAKcmVzb2x1dGlvbgAAAAAAAAAAAAEAAAAE",
      "AAAAAAAAAAAAAAAFcHJpY2UAAAAAAAACAAAAAAAAAAZfYXNzZXQAAAAAB9AAAAAFQXNzZXQAAAAAAAAAAAAACl90aW1lc3RhbXAAAAAAAAYAAAABAAAD6AAAB9AAAAAJUHJpY2VEYXRhAAAA",
      "AAAAAAAAAAAAAAAGcHJpY2VzAAAAAAACAAAAAAAAAAZfYXNzZXQAAAAAB9AAAAAFQXNzZXQAAAAAAAAAAAAACF9yZWNvcmRzAAAABAAAAAEAAAPoAAAD6gAAB9AAAAAJUHJpY2VEYXRhAAAA",
      "AAAAAAAAAAAAAAAEYmFzZQAAAAAAAAABAAAH0AAAAAVBc3NldAAAAA==",
      "AAAAAAAAAAAAAAAIZGVjaW1hbHMAAAAAAAAAAQAAAAQ=",
      "AAAAAAAAAAAAAAAGYXNzZXRzAAAAAAAAAAAAAQAAA+oAAAfQAAAABUFzc2V0AAAA",
      "AAAAAAAAAAAAAAAJbGFzdHByaWNlAAAAAAAAAQAAAAAAAAAFYXNzZXQAAAAAAAfQAAAABUFzc2V0AAAAAAAAAQAAA+gAAAfQAAAACVByaWNlRGF0YQAAAA==",
      "AAAAAAAAAWhJbml0aWFsaXplIHRoZSBjb250cmFjdCB3aXRoIHRoZSBhZG1pbiBhbmQgdGhlIG9yYWNsZSBjb25maWd1cmF0aW9ucwoKIyMjIEFyZ3VtZW50cwoqIGBhZG1pbmAgLSBUaGUgYWRkcmVzcyBvZiB0aGUgYWRtaW4KKiBgdXNkY2AgLSBUaGUgYWRkcmVzcyBvZiB0aGUgVVNEQyB0b2tlbgoqIGB1c2RjX29yYWNsZWAgLSBUaGUgYWRkcmVzcyBvZiB0aGUgVVNEQyBvcmFjbGUKKiBgZGVmYXVsdF9vcmFjbGVgIC0gVGhlIGFkZHJlc3Mgb2YgdGhlIG9yYWNsZSBmb3IgYWxsIG5vbi1VU0RDIGFzc2V0cwoKIyMjIEVycm9ycwoqIGBBbHJlYWR5SW5pdGlhbGl6ZWRgIC0gVGhlIGNvbnRyYWN0IGhhcyBhbHJlYWR5IGJlZW4gaW5pdGlhbGl6ZWQAAAAKaW5pdGlhbGl6ZQAAAAAABAAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAR1c2RjAAAAEwAAAAAAAAALdXNkY19vcmFjbGUAAAAAEwAAAAAAAAAOZGVmYXVsdF9vcmFjbGUAAAAAABMAAAAA",
      "AAAAAAAAAIAoQWRtaW4gb25seSkgQmxvY2sgYW4gYXNzZXQKCiMjIyBBcmd1bWVudHMKKiBgYXNzZXRgIC0gVGhlIGFzc2V0IHRvIGJsb2NrCgojIyMgRXJyb3JzCiogYEFzc2V0Tm90Rm91bmRgIC0gVGhlIGFzc2V0IGlzIG5vdCBmb3VuZAAAAAVibG9jawAAAAAAAAEAAAAAAAAABWFzc2V0AAAAAAAH0AAAAAVBc3NldAAAAAAAAAA=",
      "AAAAAAAAAIQoQWRtaW4gb25seSkgVW5ibG9jayBhbiBhc3NldAoKIyMjIEFyZ3VtZW50cwoqIGBhc3NldGAgLSBUaGUgYXNzZXQgdG8gdW5ibG9jawoKIyMjIEVycm9ycwoqIGBBc3NldE5vdEZvdW5kYCAtIFRoZSBhc3NldCBpcyBub3QgZm91bmQAAAAHdW5ibG9jawAAAAABAAAAAAAAAAVhc3NldAAAAAAAB9AAAAAFQXNzZXQAAAAAAAAA",
      "AAAAAAAAAFMoQWRtaW4gb25seSkgU2V0IHRoZSBhZG1pbiBhZGRyZXNzCgojIyMgQXJndW1lbnRzCiogYGFkbWluYCAtIFRoZSBuZXcgYWRtaW4gYWRkcmVzcwAAAAAJc2V0X2FkbWluAAAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==",
      "AAAABAAAAAAAAAAAAAAAFk9yYWNsZUFnZ3JlZ2F0b3JFcnJvcnMAAAAAAAkAAAAAAAAAEkFscmVhZHlJbml0aWFsaXplZAAAAAAAAwAAAAAAAAAOTm90SW1wbGVtZW50ZWQAAAAAAGQAAAAAAAAAE0ludmFsaWRPcmFjbGVDb25maWcAAAAAZQAAAAAAAAANSW52YWxpZEFzc2V0cwAAAAAAAGYAAAAAAAAADk9yYWNsZU5vdEZvdW5kAAAAAABnAAAAAAAAABVDaXJjdWl0QnJlYWtlclRyaXBwZWQAAAAAAABoAAAAAAAAAA1Bc3NldE5vdEZvdW5kAAAAAAAAaQAAAAAAAAAQSW52YWxpZFRpbWVzdGFtcAAAAGoAAAAAAAAADEFzc2V0QmxvY2tlZAAAAGs=",
      "AAAAAgAAAAAAAAAAAAAAEUFnZ3JlZ2F0b3JEYXRhS2V5AAAAAAAABAAAAAEAAAAAAAAAC0Fzc2V0Q29uZmlnAAAAAAEAAAfQAAAABUFzc2V0AAAAAAAAAQAAAAAAAAAUQ2lyY3VpdEJyZWFrZXJTdGF0dXMAAAABAAAH0AAAAAVBc3NldAAAAAAAAAEAAAAAAAAAFUNpcmN1aXRCcmVha2VyVGltZW91dAAAAAAAAAEAAAfQAAAABUFzc2V0AAAAAAAAAQAAAAAAAAAHQmxvY2tlZAAAAAABAAAH0AAAAAVBc3NldAAAAA==",
      "AAAAAQAAAAAAAAAAAAAADE9yYWNsZUNvbmZpZwAAAAQAAAAsVGhlIGFzc2V0IHRvIGJlIHVzZWQgd2hlbiBmZXRjaGluZyB0aGUgcHJpY2UAAAAFYXNzZXQAAAAAAAfQAAAABUFzc2V0AAAAAAAAIVRoZSBkZWNpbWFscyBvZiB0aGUgc291cmNlIG9yYWNsZQAAAAAAAAhkZWNpbWFscwAAAAQAAAAgVGhlIGFkZHJlc3Mgb2YgdGhlIHNvdXJjZSBvcmFjbGUAAAAJb3JhY2xlX2lkAAAAAAAAEwAAACNUaGUgcmVzb2x1dGlvbiBvZiB0aGUgc291cmNlIG9yYWNsZQAAAAAKcmVzb2x1dGlvbgAAAAAABA==",
      "AAAAAQAAAC9QcmljZSBkYXRhIGZvciBhbiBhc3NldCBhdCBhIHNwZWNpZmljIHRpbWVzdGFtcAAAAAAAAAAACVByaWNlRGF0YQAAAAAAAAIAAAAAAAAABXByaWNlAAAAAAAACwAAAAAAAAAJdGltZXN0YW1wAAAAAAAABg==",
      "AAAAAgAAAApBc3NldCB0eXBlAAAAAAAAAAAABUFzc2V0AAAAAAAAAgAAAAEAAAAAAAAAB1N0ZWxsYXIAAAAAAQAAABMAAAABAAAAAAAAAAVPdGhlcgAAAAAAAAEAAAAR"
    ]);
  }

  public initialize(
    admin: Address,
    usdc: Address,
    usdc_oracle: Address,
    default_oracle: Address
  ) {
    const invokeArgs = this.spec.funcArgsToScVals('initialize', {
      admin,
      usdc,
      usdc_oracle,
      default_oracle
    });
    const operation = this.call('initialize', ...invokeArgs);
    return operation.toXDR('base64');
  }
}