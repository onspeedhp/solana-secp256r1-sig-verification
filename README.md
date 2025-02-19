cargo run -- localnet list-market ~/.config/solana/id.json HKfcbzTNewAijWTgd5tGmWK1Rp7Uf9CwXrbWiGtE4nNe --coin-mint 8xQgnRzH5zFjY9HBjfZ3bBsQUFBwRTAvPNbbRYPyTejr --pc-mint BDFvMctxdw2MRHm6jZZq14sDoC28KCi4jFFtYxDqExwF
solana program deploy ./dex/target/sbf-solana-solana/release/serum_dex.so
cargo run -- localnet whole-shebang ~/.config/solana/id.json HKfcbzTNewAijWTgd5tGmWK1Rp7Uf9CwXrbWiGtE4nNe

solana-test-validator --clone-upgradeable-program EoTcMgcDRTJVZDMZWBoU6rhYHZfkNTVEAfz3uUJRcYGj --clone-upgradeable-program HWy1jotHpo6UqeQxx49dpYYdQB8wj9Qk9MdxwjLvDHB8 --clone 8QN9yfKqWDoKjvZmqFsgCzAqwZBQuzVVnC388dN5RCPo --clone 3XMrhbv989VxAMi3DErLV9eJht1pHppW5LbKxe9fkEFR --url devnet --reset