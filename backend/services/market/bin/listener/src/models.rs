// BLACKER
// Copyright (C) 2026 Juan José Caballero Rey
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation version 3 of the License.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

use clickhouse::Row;
use serde::Serialize;

#[derive(Debug, Clone, Row, Serialize)]
pub struct Tick {
    pub source: String,
    pub symbol: String,
    pub id: String,
    pub time: u64,
    pub price: u64,
    pub qty: u64,
    pub is_buyer_maker: u8,
}