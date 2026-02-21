use ciborium::de::from_reader;
use ciborium::ser::into_writer;
use serde::Serialize;
use serde::de::DeserializeOwned;

pub fn to_cbor_bytes<T: Serialize>(
    value: &T,
) -> Result<Vec<u8>, ciborium::ser::Error<std::io::Error>> {
    let mut buffer = Vec::new();
    into_writer(value, &mut buffer)?;
    Ok(buffer)
}

pub fn from_cbor_bytes<T: DeserializeOwned>(
    bytes: &[u8],
) -> Result<T, ciborium::de::Error<std::io::Error>> {
    from_reader(bytes)
}
