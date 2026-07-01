class Asset {
  constructor(id, type_id, name, status, qr_code, create_at) {
   this.id = id;
   this.type_id = type_id;
   this.name = name;
   this.status = status;
   this.qr_code = qr_code;
   this.create_at = create_at;
  }
}

module.exports = Asset;