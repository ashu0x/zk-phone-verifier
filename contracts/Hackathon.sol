// This file is MIT Licensed.
//
// Copyright 2017 Christian Reitwiessner
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
pragma solidity ^0.8.0;


 struct Proof {
        Pairing.G1Point a;
        Pairing.G2Point b;
        Pairing.G1Point c;
}

contract Hackathon{

    address public verifier;

    bytes public verifierPubkey;

    address owner;

    struct Request {
        uint256 areaCode;
        address to;
        bytes numberHash;
    }

    mapping(address => Request) public requests;

    mapping(bytes32 => bool) public otpHash;

    mapping(address => bool) public verified;

    mapping(uint8 => address) public proofContract;

    event Requested(address,bytes);


    constructor(address v,bytes memory pubKey){
        owner = msg.sender;
        verifierPubkey = pubKey;
        verifier =v;
    }

    

    function changeVerifier(address _v,bytes memory _pubKey) external {
        require(msg.sender == owner);
        verifier = _v;
        verifierPubkey = _pubKey;
    }

    function changeProofContracts(uint8 series,address c) external {
        require(msg.sender == owner);
        proofContract[series] = c;

    }


    function register(uint8 seriesNumber,Proof memory proof, uint[1] memory _areaCode,address _to,bytes memory hash) external {
        address v = proofContract[seriesNumber];
        require(Verifier(v).verifyTx(proof,_areaCode));
        requests[msg.sender] =  Request(_areaCode[0],_to,hash);
        emit Requested(_to, hash);
    }

    function oTp(bytes32 _o) external {
        require(msg.sender == verifier);
        otpHash[_o] = true;
    }

    function verify(uint256 _otp,address user) external {
        require(otpHash[keccak256(abi.encodePacked(_otp))]);
        verified[user] = true;
    }
}


library Pairing {
    struct G1Point {
        uint X;
        uint Y;
    }
    // Encoding of field elements is: X[0] * z + X[1]
    struct G2Point {
        uint[2] X;
        uint[2] Y;
    }
    /// @return the generator of G1
    function P1() pure internal returns (G1Point memory) {
        return G1Point(1, 2);
    }
    /// @return the generator of G2
    function P2() pure internal returns (G2Point memory) {
        return G2Point(
            [10857046999023057135944570762232829481370756359578518086990519993285655852781,
             11559732032986387107991004021392285783925812861821192530917403151452391805634],
            [8495653923123431417604973247489272438418190587263600148770280649306958101930,
             4082367875863433681332203403145435568316851327593401208105741076214120093531]
        );
    }
    /// @return the negation of p, i.e. p.addition(p.negate()) should be zero.
    function negate(G1Point memory p) pure internal returns (G1Point memory) {
        // The prime q in the base field F_q for G1
        uint q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
        if (p.X == 0 && p.Y == 0)
            return G1Point(0, 0);
        return G1Point(p.X, q - (p.Y % q));
    }
    /// @return r the sum of two points of G1
    function addition(G1Point memory p1, G1Point memory p2) internal view returns (G1Point memory r) {
        uint[4] memory input;
        input[0] = p1.X;
        input[1] = p1.Y;
        input[2] = p2.X;
        input[3] = p2.Y;
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require(success);
    }


    /// @return r the product of a point on G1 and a scalar, i.e.
    /// p == p.scalar_mul(1) and p.addition(p) == p.scalar_mul(2) for all points p.
    function scalar_mul(G1Point memory p, uint s) internal view returns (G1Point memory r) {
        uint[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require (success);
    }
    /// @return the result of computing the pairing check
    /// e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
    /// For example pairing([P1(), P1().negate()], [P2(), P2()]) should
    /// return true.
    function pairing(G1Point[] memory p1, G2Point[] memory p2) internal view returns (bool) {
        require(p1.length == p2.length);
        uint elements = p1.length;
        uint inputSize = elements * 6;
        uint[] memory input = new uint[](inputSize);
        for (uint i = 0; i < elements; i++)
        {
            input[i * 6 + 0] = p1[i].X;
            input[i * 6 + 1] = p1[i].Y;
            input[i * 6 + 2] = p2[i].X[1];
            input[i * 6 + 3] = p2[i].X[0];
            input[i * 6 + 4] = p2[i].Y[1];
            input[i * 6 + 5] = p2[i].Y[0];
        }
        uint[1] memory out;
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require(success);
        return out[0] != 0;
    }
    /// Convenience method for a pairing check for two pairs.
    function pairingProd2(G1Point memory a1, G2Point memory a2, G1Point memory b1, G2Point memory b2) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](2);
        G2Point[] memory p2 = new G2Point[](2);
        p1[0] = a1;
        p1[1] = b1;
        p2[0] = a2;
        p2[1] = b2;
        return pairing(p1, p2);
    }
    /// Convenience method for a pairing check for three pairs.
    function pairingProd3(
            G1Point memory a1, G2Point memory a2,
            G1Point memory b1, G2Point memory b2,
            G1Point memory c1, G2Point memory c2
    ) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](3);
        G2Point[] memory p2 = new G2Point[](3);
        p1[0] = a1;
        p1[1] = b1;
        p1[2] = c1;
        p2[0] = a2;
        p2[1] = b2;
        p2[2] = c2;
        return pairing(p1, p2);
    }
    /// Convenience method for a pairing check for four pairs.
    function pairingProd4(
            G1Point memory a1, G2Point memory a2,
            G1Point memory b1, G2Point memory b2,
            G1Point memory c1, G2Point memory c2,
            G1Point memory d1, G2Point memory d2
    ) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](4);
        G2Point[] memory p2 = new G2Point[](4);
        p1[0] = a1;
        p1[1] = b1;
        p1[2] = c1;
        p1[3] = d1;
        p2[0] = a2;
        p2[1] = b2;
        p2[2] = c2;
        p2[3] = d2;
        return pairing(p1, p2);
    }
}

contract Verifier {
    using Pairing for *;
    struct VerifyingKey {
        Pairing.G1Point alpha;
        Pairing.G2Point beta;
        Pairing.G2Point gamma;
        Pairing.G2Point delta;
        Pairing.G1Point[] gamma_abc;
    }
   
    function verifyingKey() pure internal returns (VerifyingKey memory vk) {
        vk.alpha = Pairing.G1Point(uint256(0x03fb8077badfbdd51b77f6bcc4f6f52eb40f81563d38f4efcbf66307641bf637), uint256(0x1f7ba4e908e3af77cb5249b16f810570d8e2836cc5346d5d3a8fa5bc1afc764f));
        vk.beta = Pairing.G2Point([uint256(0x169ff37778b6b93ff31abe07b91e2cb40f8f40c042ae8b19a4eb5b2e57a928d8), uint256(0x27d8008af1e530c56c2bf8ffd92c4f12e5f96b253a487a025413c207a0faedac)], [uint256(0x1c6b9ff0f261f6404c03930015f96a37c24d9cf7c79feba2768ec4731f997ef8), uint256(0x1e8596ce4bb96ba0152ed0500f9b1826061fc43ec1aba97e42a31576fee033d6)]);
        vk.gamma = Pairing.G2Point([uint256(0x1789d89d166867a757189ef7c12fba8129547b1d8c0622ddd303497dfecd432e), uint256(0x13a21d8fd1f04062fb604db0a3daad5973ac30da723fc3ce4f985284ff760fc8)], [uint256(0x1f72b093e46720c1f030f4c596f5467d069ee495b0d82fb9b9c0cd75ec08f002), uint256(0x1b3c78e6502df3fc538a9dd4e50dd28947e4bebc2e36935db11370e4f09be57f)]);
        vk.delta = Pairing.G2Point([uint256(0x2c282362d9dbd2565632e53c3e2bcebd5ce7e3c2ccef9cd6208af2384ae0dcaa), uint256(0x29937c75a1a9e9c604e4b2a7e01c47260f98e590da24c6f99208fa96e6e1519b)], [uint256(0x2bc247a823127021e25eda929d0a2bfb80042b41b4689ecfeb64ad6e990998e0), uint256(0x0bd6b53cef333cf978bce3ebf9b5fcce93acb03ce864bcabce0196ce4a7a98c7)]);
        vk.gamma_abc = new Pairing.G1Point[](2);
        vk.gamma_abc[0] = Pairing.G1Point(uint256(0x2dd0226ead383d4b1ae454b17be3f708c67228251a031ff0b4a03994e961bd29), uint256(0x1d65c2d74ec0f4a4fb7d1d1895498bad58cb7c1a8b8de9f906a9fcdadcab6d93));
        vk.gamma_abc[1] = Pairing.G1Point(uint256(0x2c7521b47eabafcb2494e4cbb7cb12f1d248e868f5d5ecde59c25e56e32bbdc2), uint256(0x0b9ff158f9e4248be2a6b17b95ebe79d54f238035df22bbf92b42f720d21a747));
    }
    function verify(uint[] memory input, Proof memory proof) internal view returns (uint) {
        uint256 snark_scalar_field = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
        VerifyingKey memory vk = verifyingKey();
        require(input.length + 1 == vk.gamma_abc.length);
        // Compute the linear combination vk_x
        Pairing.G1Point memory vk_x = Pairing.G1Point(0, 0);
        for (uint i = 0; i < input.length; i++) {
            require(input[i] < snark_scalar_field);
            vk_x = Pairing.addition(vk_x, Pairing.scalar_mul(vk.gamma_abc[i + 1], input[i]));
        }
        vk_x = Pairing.addition(vk_x, vk.gamma_abc[0]);
        if(!Pairing.pairingProd4(
             proof.a, proof.b,
             Pairing.negate(vk_x), vk.gamma,
             Pairing.negate(proof.c), vk.delta,
             Pairing.negate(vk.alpha), vk.beta)) return 1;
        return 0;
    }
    function verifyTx(
            Proof memory proof, uint[1] memory input
        ) public view returns (bool r) {
        uint[] memory inputValues = new uint[](1);
        
        for(uint i = 0; i < input.length; i++){
            inputValues[i] = input[i];
        }
        if (verify(inputValues, proof) == 0) {
            return true;
        } else {
            return false;
        }
    }
}
